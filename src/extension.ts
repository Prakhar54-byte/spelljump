import * as vscode from 'vscode';
import { AdaptiveLearner, isAdaptiveLearningEnabled } from './adaptiveLearner';
import { HybridTypoDetector } from './aiDetector';
import { SpellJumpDecorations, toDiagnostics } from './decorations';
import { Typo, TypoDetector } from './detector';
import { jumpToTypo } from './jumper';
import { SpellJumpStatusBar } from './statusBar';

const debounceMs = 350;

export function activate(context: vscode.ExtensionContext) {
	console.log('🦇 SpellJump is now active!');

	// ── Core objects ──────────────────────────────────────────────────────────
	const learner = new AdaptiveLearner(context);
	const detector = new HybridTypoDetector(context);
	detector.learner = learner; // inject singleton

	const diagnostics = vscode.languages.createDiagnosticCollection('spelljump');
	const decorations = new SpellJumpDecorations();
	const statusBar = new SpellJumpStatusBar();
	const state = new SpellJumpController(detector, learner, diagnostics, decorations, statusBar);

	// ── Subscriptions ─────────────────────────────────────────────────────────
	context.subscriptions.push(
		diagnostics,
		decorations,
		statusBar,

		// Navigation commands
		vscode.commands.registerCommand('spelljump.jumpToNext', () => state.jump('next')),
		vscode.commands.registerCommand('spelljump.jumpToPrevious', () => state.jump('previous')),

		// Adaptive learning commands
		vscode.commands.registerCommand('spelljump.toggleAdaptiveLearning', () => state.toggleAdaptiveLearning()),
		vscode.commands.registerCommand('spelljump.addWordToGlobalDictionary', (word?: string) =>
			state.promptAddWord(word, 'global'),
		),
		vscode.commands.registerCommand('spelljump.addWordToWorkspaceDictionary', (word?: string) =>
			state.promptAddWord(word, 'workspace'),
		),
		vscode.commands.registerCommand('spelljump.forgetWord', (word?: string) =>
			state.promptForgetWord(word),
		),
		vscode.commands.registerCommand('spelljump.viewDictionary', () => state.viewDictionary()),

		// Code Action provider — right-click on a flagged word
		vscode.languages.registerCodeActionsProvider(
			{ scheme: '*' },
			new SpellJumpCodeActionProvider(learner),
			{ providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] },
		),

		// Document events
		vscode.workspace.onDidChangeTextDocument((event) => state.schedule(event.document)),
		vscode.window.onDidChangeActiveTextEditor((editor) => {
			void state.refresh(editor?.document);
			// Scan symbols in newly active document
			if (editor?.document) {
				void learner.scanDocumentSymbols(editor.document);
			}
		}),

		// React to settings changes (enable/disable adaptive learning)
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('spelljump.adaptiveLearning')) {
				statusBar.updateAdaptiveMode(isAdaptiveLearningEnabled());
				void state.refresh(vscode.window.activeTextEditor?.document);
			}
		}),
	);

	// Initial load
	void state.refresh(vscode.window.activeTextEditor?.document);
	if (vscode.window.activeTextEditor?.document) {
		void learner.scanDocumentSymbols(vscode.window.activeTextEditor.document);
	}
	statusBar.updateAdaptiveMode(isAdaptiveLearningEnabled());
}

export function deactivate() {}

// ─── Controller ───────────────────────────────────────────────────────────────
class SpellJumpController {
	private readonly findings = new Map<string, Typo[]>();
	private debounce?: NodeJS.Timeout;

	public constructor(
		private readonly detector: TypoDetector,
		private readonly learner: AdaptiveLearner,
		private readonly diagnostics: vscode.DiagnosticCollection,
		private readonly decorations: SpellJumpDecorations,
		private readonly statusBar: SpellJumpStatusBar,
	) {}

	public schedule(document: vscode.TextDocument): void {
		if (!this.shouldCheck(document)) {
			return;
		}

		if (this.debounce) {
			clearTimeout(this.debounce);
		}

		this.debounce = setTimeout(() => {
			void this.refresh(document);
		}, debounceMs);
	}

	public async refresh(document: vscode.TextDocument | undefined): Promise<void> {
		if (!document || !this.shouldCheck(document)) {
			this.statusBar.update(0);
			this.decorations.update(vscode.window.activeTextEditor, []);
			return;
		}

		const typos = await this.detector.detect(document.getText());
		this.findings.set(document.uri.toString(), typos);
		this.diagnostics.set(document.uri, toDiagnostics(document, typos));

		if (vscode.window.activeTextEditor?.document.uri.toString() === document.uri.toString()) {
			this.decorations.update(vscode.window.activeTextEditor, typos);
			this.statusBar.update(typos.length);
		}
	}

	public async jump(direction: 'next' | 'previous'): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		await this.refresh(editor.document);
		const typos = this.findings.get(editor.document.uri.toString()) ?? [];
		if (!jumpToTypo(editor, typos, direction)) {
			vscode.window.setStatusBarMessage('SpellJump: no typos found 🦇', 2000);
		}
	}

	// ── Adaptive Learning UI actions ────────────────────────────────────────

	public async toggleAdaptiveLearning(): Promise<void> {
		const current = isAdaptiveLearningEnabled();
		await vscode.workspace
			.getConfiguration('spelljump')
			.update('adaptiveLearning.enabled', !current, vscode.ConfigurationTarget.Global);

		const label = !current ? 'ON 🧠' : 'OFF';
		vscode.window.showInformationMessage(`SpellJump Adaptive Learning: ${label}`);
	}

	public async promptAddWord(word: string | undefined, scope: 'global' | 'workspace'): Promise<void> {
		const input =
			word ??
			(await vscode.window.showInputBox({
				prompt: `Add word to SpellJump ${scope} dictionary`,
				placeHolder: 'e.g. myCustomVar',
			}));

		if (!input) {
			return;
		}

		if (scope === 'global') {
			this.learner.addToGlobal(input.trim());
		} else {
			this.learner.addToWorkspace(input.trim());
		}

		// Re-scan so the word disappears from highlights immediately
		void this.refresh(vscode.window.activeTextEditor?.document);
	}

	public async promptForgetWord(word: string | undefined): Promise<void> {
		const input =
			word ??
			(await vscode.window.showInputBox({
				prompt: 'Remove word from SpellJump dictionary',
				placeHolder: 'e.g. myCustomVar',
			}));

		if (!input) {
			return;
		}

		this.learner.forget(input.trim());
		void this.refresh(vscode.window.activeTextEditor?.document);
	}

	public async viewDictionary(): Promise<void> {
		const global = this.learner.getGlobalWords();
		const workspace = this.learner.getWorkspaceWords();

		const items: vscode.QuickPickItem[] = [
			{ label: '$(globe) Global Dictionary', kind: vscode.QuickPickItemKind.Separator },
			...global.map((w) => ({ label: w, description: 'global', buttons: [] })),
			{ label: '$(folder) Workspace Dictionary', kind: vscode.QuickPickItemKind.Separator },
			...workspace.map((w) => ({ label: w, description: 'workspace', buttons: [] })),
		];

		if (global.length === 0 && workspace.length === 0) {
			vscode.window.showInformationMessage('SpellJump: Your dictionary is empty.');
			return;
		}

		const picked = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select a word to remove it from the dictionary',
			title: '🦇 SpellJump — Your Learned Dictionary',
		});

		if (picked && picked.kind !== vscode.QuickPickItemKind.Separator) {
			const confirm = await vscode.window.showWarningMessage(
				`Remove "${picked.label}" from dictionary?`,
				{ modal: false },
				'Remove',
			);
			if (confirm === 'Remove') {
				this.learner.forget(picked.label);
				void this.refresh(vscode.window.activeTextEditor?.document);
			}
		}
	}

	private shouldCheck(document: vscode.TextDocument): boolean {
		return !document.isUntitled || document.getText().length > 0;
	}
}

// ─── Code Action Provider ─────────────────────────────────────────────────────
class SpellJumpCodeActionProvider implements vscode.CodeActionProvider {
	public constructor(private readonly learner: AdaptiveLearner) {}

	public provideCodeActions(
		document: vscode.TextDocument,
		range: vscode.Range,
	): vscode.CodeAction[] {
		// Get the word at the cursor position
		const wordRange = document.getWordRangeAtPosition(range.start, /[A-Za-z][A-Za-z']*/);
		if (!wordRange) {
			return [];
		}
		const word = document.getText(wordRange);
		if (!word || word.length < 2) {
			return [];
		}

		const actions: vscode.CodeAction[] = [];

		// "Add to Global Dictionary"
		const addGlobal = new vscode.CodeAction(
			`🌐 SpellJump: Add "${word}" to global dictionary`,
			vscode.CodeActionKind.QuickFix,
		);
		addGlobal.command = {
			command: 'spelljump.addWordToGlobalDictionary',
			title: 'Add to global dictionary',
			arguments: [word],
		};

		// "Add to Workspace Dictionary"
		const addWorkspace = new vscode.CodeAction(
			`📁 SpellJump: Add "${word}" to workspace dictionary`,
			vscode.CodeActionKind.QuickFix,
		);
		addWorkspace.command = {
			command: 'spelljump.addWordToWorkspaceDictionary',
			title: 'Add to workspace dictionary',
			arguments: [word],
		};

		actions.push(addGlobal, addWorkspace);

		// If the word is already learned, offer to forget it
		if (this.learner.isKnown(word)) {
			const forget = new vscode.CodeAction(
				`🗑️ SpellJump: Remove "${word}" from dictionary`,
				vscode.CodeActionKind.QuickFix,
			);
			forget.command = {
				command: 'spelljump.forgetWord',
				title: 'Remove from dictionary',
				arguments: [word],
			};
			actions.push(forget);
		}

		return actions;
	}
}
