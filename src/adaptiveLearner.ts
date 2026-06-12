

import * as vscode from 'vscode';

// ─── Storage keys ────────────────────────────────────────────────────────────
const GLOBAL_DICT_KEY = 'spelljump.globalDictionary';
const WORKSPACE_DICT_KEY = 'spelljump.workspaceDictionary';
const FREQ_KEY = 'spelljump.frequencyMap';

// ─── Config helpers ───────────────────────────────────────────────────────────
function cfg<T>(key: string, fallback: T): T {
	return vscode.workspace.getConfiguration('spelljump').get<T>(key, fallback);
}

export function isAdaptiveLearningEnabled(): boolean {
	return cfg<boolean>('adaptiveLearning.enabled', true);
}

function autoLearnThreshold(): number {
	return Math.max(1, cfg<number>('adaptiveLearning.autoLearnThreshold', 3));
}

// ─── Serialisable state ───────────────────────────────────────────────────────
type Dictionary = Set<string>;
type FrequencyMap = Map<string, number>;

// ─── AdaptiveLearner class ────────────────────────────────────────────────────
export class AdaptiveLearner {
	private globalDict: Dictionary = new Set();
	private workspaceDict: Dictionary = new Set();
	private freqMap: FrequencyMap = new Map();

	public constructor(private readonly context: vscode.ExtensionContext) {
		this.loadState();
	}

	// ── Public query ────────────────────────────────────────────────────────

	/** Returns true if the word should be suppressed (is in either learned dictionary). */
	public isKnown(word: string): boolean {
		const lower = word.toLowerCase();
		return this.globalDict.has(lower) || this.workspaceDict.has(lower);
	}

	// ── Explicit "Add to Dictionary" ────────────────────────────────────────

	/** Explicitly adds a word to the global dictionary (persisted across workspaces). */
	public addToGlobal(word: string): void {
		const lower = word.toLowerCase();
		this.globalDict.add(lower);
		this.freqMap.delete(lower); // no longer needs frequency tracking
		void this.saveState();
		vscode.window.showInformationMessage(`🦇 SpellJump: "${word}" added to global dictionary.`);
	}

	/** Explicitly adds a word to the workspace dictionary (local to this project). */
	public addToWorkspace(word: string): void {
		const lower = word.toLowerCase();
		this.workspaceDict.add(lower);
		this.freqMap.delete(lower);
		void this.saveState();
		vscode.window.showInformationMessage(`📁 SpellJump: "${word}" added to workspace dictionary.`);
	}

	/** Removes a word from all dictionaries (un-learns it). */
	public forget(word: string): void {
		const lower = word.toLowerCase();
		this.globalDict.delete(lower);
		this.workspaceDict.delete(lower);
		this.freqMap.delete(lower);
		void this.saveState();
		vscode.window.showInformationMessage(`🗑️ SpellJump: "${word}" removed from dictionary.`);
	}

	// ── Frequency-based auto-learning ───────────────────────────────────────

	/**
	 * Called by the detector pipeline when a word survives the scan without being corrected.
	 * When the word has been seen ≥ threshold times it is automatically added to the global dict.
	 */
	public recordSeen(word: string): void {
		if (!isAdaptiveLearningEnabled()) {
			return;
		}
		const lower = word.toLowerCase();
		if (this.isKnown(lower)) {
			return;
		}
		const count = (this.freqMap.get(lower) ?? 0) + 1;
		this.freqMap.set(lower, count);

		if (count >= autoLearnThreshold()) {
			this.globalDict.add(lower);
			this.freqMap.delete(lower);
			void this.saveState();
			vscode.window.setStatusBarMessage(
				`🦇 SpellJump: auto-learned "${word}" after ${count} occurrences.`,
				3000,
			);
		} else {
			// Debounced save — save on every 5th seen to limit I/O
			if (count % 5 === 0) {
				void this.saveState();
			}
		}
	}

	// ── Document symbol scanner ──────────────────────────────────────────────

	/**
	 * Inspects the active document's symbols (variables, functions, classes, etc.)
	 * and adds them to the workspace dictionary so they are never flagged.
	 *
	 * This is a best-effort call — if VS Code cannot provide symbols we skip gracefully.
	 */
	public async scanDocumentSymbols(document: vscode.TextDocument): Promise<void> {
		if (!isAdaptiveLearningEnabled()) {
			return;
		}
		try {
			const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
				'vscode.executeDocumentSymbolProvider',
				document.uri,
			);
			if (!symbols) {
				return;
			}
			const identifiers = this.flattenSymbols(symbols);
			for (const id of identifiers) {
				// Split camelCase / PascalCase / snake_case into constituent words
				for (const part of splitIdentifier(id)) {
					if (part.length >= 3) {
						this.workspaceDict.add(part.toLowerCase());
					}
				}
			}

			// Pruning logic: keep workspaceDict capped to prevent memory/storage issues
			if (this.workspaceDict.size > 2000) {
				const words = [...this.workspaceDict].slice(-2000);
				this.workspaceDict = new Set(words);
			}

			// Persist once after bulk scan
			void this.saveState();
		} catch {
			// Symbol provider may not exist for some languages — silently skip
		}
	}

	// ── Dictionary inspection (for Quick Pick UI) ────────────────────────────

	public getGlobalWords(): string[] {
		return [...this.globalDict].sort();
	}

	public getWorkspaceWords(): string[] {
		return [...this.workspaceDict].sort();
	}

	// ── Persistence ─────────────────────────────────────────────────────────

	private loadState(): void {
		const globalArr = this.context.globalState.get<string[]>(GLOBAL_DICT_KEY, []);
		const workspaceArr = this.context.workspaceState.get<string[]>(WORKSPACE_DICT_KEY, []);
		const freqEntries = this.context.globalState.get<[string, number][]>(FREQ_KEY, []);

		this.globalDict = new Set(globalArr);
		this.workspaceDict = new Set(workspaceArr);
		this.freqMap = new Map(freqEntries);
	}

	public async saveState(): Promise<void> {
		await this.context.globalState.update(GLOBAL_DICT_KEY, [...this.globalDict]);
		await this.context.workspaceState.update(WORKSPACE_DICT_KEY, [...this.workspaceDict]);
		await this.context.globalState.update(FREQ_KEY, [...this.freqMap.entries()]);
	}

	// ── Helpers ──────────────────────────────────────────────────────────────

	private flattenSymbols(symbols: vscode.DocumentSymbol[]): string[] {
		const names: string[] = [];
		for (const sym of symbols) {
			names.push(sym.name);
			if (sym.children.length > 0) {
				names.push(...this.flattenSymbols(sym.children));
			}
		}
		return names;
	}
}

// ─── Identifier splitter ─────────────────────────────────────────────────────
// Splits camelCase, PascalCase, snake_case, SCREAMING_SNAKE into word parts.
function splitIdentifier(id: string): string[] {
	return id
		.replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase → camel Case
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // ACRONYMWord → ACRONYM Word
		.replace(/[_\-\s]+/g, ' ') // snake_case, kebab-case
		.split(' ')
		.map((w) => w.trim())
		.filter((w) => w.length > 0);
}
