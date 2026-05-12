import * as path from 'path';
import type { ExtensionContext } from 'vscode';
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

	public constructor(context: ExtensionContext) {
		this.modelPath = path.join(context.extensionPath, 'model', 'spelljump.onnx');
	}

	public async detect(text: string): Promise<Typo[]> {
		const session = await this.getSession();
		if (!session) {
			return this.fallback.detect(text);
		}

		return this.detectWithModel(session, text);
	}

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
