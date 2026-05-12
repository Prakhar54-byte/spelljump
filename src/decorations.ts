import * as vscode from 'vscode';
import { Typo } from './detector';

export class SpellJumpDecorations {
	private readonly warningDecoration = vscode.window.createTextEditorDecorationType({
		textDecoration: 'underline wavy #d97706',
	});

	private readonly errorDecoration = vscode.window.createTextEditorDecorationType({
		textDecoration: 'underline wavy #dc2626',
	});

	public update(editor: vscode.TextEditor | undefined, typos: Typo[]): void {
		if (!editor) {
			return;
		}

		const warnings: vscode.Range[] = [];
		const errors: vscode.Range[] = [];

		for (const typo of typos) {
			const range = new vscode.Range(
				editor.document.positionAt(typo.start),
				editor.document.positionAt(typo.end),
			);
			if (typo.severity === 'error') {
				errors.push(range);
			} else {
				warnings.push(range);
			}
		}

		editor.setDecorations(this.warningDecoration, warnings);
		editor.setDecorations(this.errorDecoration, errors);
	}

	public dispose(): void {
		this.warningDecoration.dispose();
		this.errorDecoration.dispose();
	}
}

export function toDiagnostics(document: vscode.TextDocument, typos: Typo[]): vscode.Diagnostic[] {
	return typos.map((typo) => {
		const range = new vscode.Range(
			document.positionAt(typo.start),
			document.positionAt(typo.end),
		);
		const suggestion = typo.suggestion ? ` Suggestion: ${typo.suggestion}` : '';
		const diagnostic = new vscode.Diagnostic(
			range,
			`${typo.message}${suggestion}`,
			typo.severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning,
		);
		diagnostic.source = 'SpellJump';
		return diagnostic;
	});
}
