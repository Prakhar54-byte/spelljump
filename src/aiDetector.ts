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

	/** Injected from extension.ts so the learner is a singleton. */
	public learner?: AdaptiveLearner;

	public constructor(context: ExtensionContext) {
		this.modelPath = path.join(context.extensionPath, 'model', 'spelljump.onnx');
	}

	public async detect(text: string): Promise<Typo[]> {
		const session = await this.getSession();
		const rawTypos = session
			? await this.detectWithModel(session, text)
			: await this.fallback.detect(text);

		return this.applyAdaptiveFilter(rawTypos);
	}

	// ─── Adaptive filter ───────────────────────────────────────────────────────

	/**
	 * Intercepts the raw typo list produced by the detector.
	 * Any word that the AdaptiveLearner knows is suppressed from the results.
	 * Words that are NOT suppressed have their "seen" count bumped so the
	 * auto-learning threshold can eventually trigger.
	 */
	private applyAdaptiveFilter(typos: Typo[]): Typo[] {
		if (!this.learner || !isAdaptiveLearningEnabled()) {
			return typos;
		}

		const learner = this.learner;
		const filtered: Typo[] = [];

		for (const typo of typos) {
			if (learner.isKnown(typo.word)) {
				// Suppressed — word is in the user's personal dictionary
				continue;
			}
			// Word is flagged — record that the user typed it without correcting it
			learner.recordSeen(typo.word);
			filtered.push(typo);
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
