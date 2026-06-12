import * as path from 'path';
import type { ExtensionContext } from 'vscode';
import { AdaptiveLearner, isAdaptiveLearningEnabled } from './adaptiveLearner';
import { LowLevelTypoDetector, Typo, TypoDetector } from './detector';

interface InferenceSession {
	run(feeds: Record<string, unknown>): Promise<Record<string, unknown>>;
}

interface OnnxRuntime {
	InferenceSession: {
		create(modelPath: string): Promise<InferenceSession>;
	};
}

export class HybridTypoDetector implements TypoDetector {
	private readonly fallback = new LowLevelTypoDetector();
	private readonly modelPath: string;
	private session?: Promise<InferenceSession | undefined>;
	private readonly lastActiveTypos = new Map<string, Set<string>>();

	/** Injected from extension.ts so the learner is a singleton. */
	public learner?: AdaptiveLearner;

	public constructor(context: ExtensionContext) {
		this.modelPath = path.join(context.extensionPath, 'model', 'spelljump.onnx');
	}

	public async detect(text: string, documentUri?: string): Promise<Typo[]> {
		const session = await this.getSession();
		const rawTypos = session
			? await this.detectWithModel(session, text)
			: await this.fallback.detect(text);

		return this.applyAdaptiveFilter(rawTypos, documentUri);
	}

	// ─── Adaptive filter ───────────────────────────────────────────────────────

	/**
	 * Intercepts the raw typo list produced by the detector.
	 * Any word that the AdaptiveLearner knows is suppressed from the results.
	 * Words that are NOT suppressed have their "seen" count bumped so the
	 * auto-learning threshold can eventually trigger.
	 */
	private applyAdaptiveFilter(typos: Typo[], documentUri?: string): Typo[] {
		if (!this.learner || !isAdaptiveLearningEnabled()) {
			return typos;
		}

		const learner = this.learner;
		const filtered: Typo[] = [];
		const currentWords = new Set<string>();

		const prevWords = documentUri ? (this.lastActiveTypos.get(documentUri) ?? new Set<string>()) : new Set<string>();

		for (const typo of typos) {
			const lower = typo.word.toLowerCase();
			if (learner.isKnown(lower)) {
				// Suppressed — word is in the user's personal dictionary
				continue;
			}
			currentWords.add(lower);

			// Only record as seen if it wasn't already a typo in the previous run of this document
			if (!prevWords.has(lower)) {
				learner.recordSeen(typo.word);
			}
			filtered.push(typo);
		}

		if (documentUri) {
			this.lastActiveTypos.set(documentUri, currentWords);
		}

		return filtered;
	}

	// ─── ONNX session plumbing ─────────────────────────────────────────────────

	private async getSession(): Promise<InferenceSession | undefined> {
		if (!this.session) {
			this.session = this.loadSession();
		}
		return this.session;
	}

	private async loadSession(): Promise<InferenceSession | undefined> {
		try {
			const load = new Function('moduleName', 'return require(moduleName);') as (moduleName: string) => OnnxRuntime;
			const ort = load('onnxruntime-node');
			return ort.InferenceSession.create(this.modelPath);
		} catch {
			return undefined;
		}
	}

	private async detectWithModel(_session: InferenceSession, text: string): Promise<Typo[]> {
		// The ONNX runtime hook is intentionally present, but tokenization metadata is not
		// bundled yet. Keep the extension useful by falling back until model assets exist.
		return this.fallback.detect(text);
	}
}
