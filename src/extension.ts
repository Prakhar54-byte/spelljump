import * as vscode from 'vscode';
import { HybridTypoDetector } from './aiDetector';
import { SpellJumpDecorations, toDiagnostics } from './decorations';
import { Typo, TypoDetector } from './detector';
import { jumpToTypo } from './jumper';
import { SpellJumpStatusBar } from './statusBar';

const debounceMs = 350;

export function activate(context: vscode.ExtensionContext) {
	console.log('🦇 SpellJump is now active!');
	const detector = new HybridTypoDetector(context);
	const diagnostics = vscode.languages.createDiagnosticCollection('spelljump');
	const decorations = new SpellJumpDecorations();
	const statusBar = new SpellJumpStatusBar();
	const state = new SpellJumpController(detector, diagnostics, decorations, statusBar);

	context.subscriptions.push(
		diagnostics,
		decorations,
		statusBar,
		vscode.commands.registerCommand('spelljump.jumpToNext', () => state.jump('next')),
		vscode.commands.registerCommand('spelljump.jumpToPrevious', () => state.jump('previous')),
		vscode.workspace.onDidChangeTextDocument((event) => state.schedule(event.document)),
		vscode.window.onDidChangeActiveTextEditor((editor) => state.refresh(editor?.document)),
	);

	void state.refresh(vscode.window.activeTextEditor?.document);
}

export function deactivate() {}

class SpellJumpController {
	private readonly findings = new Map<string, Typo[]>();
	private debounce?: NodeJS.Timeout;

	public constructor(
		private readonly detector: TypoDetector,
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
			vscode.window.setStatusBarMessage('SpellJump: no typos found', 2000);
		}
	}

	private shouldCheck(document: vscode.TextDocument): boolean {
		return !document.isUntitled || document.getText().length > 0;
	}
}
