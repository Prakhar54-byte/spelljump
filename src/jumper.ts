import * as vscode from 'vscode';
import { Typo } from './detector';

export type JumpDirection = 'next' | 'previous';

export function jumpToTypo(editor: vscode.TextEditor, typos: Typo[], direction: JumpDirection): boolean {
	if (typos.length === 0) {
		return false;
	}

	const cursorOffset = editor.document.offsetAt(editor.selection.active);
	const target = direction === 'next'
		? nextTypo(typos, cursorOffset)
		: previousTypo(typos, cursorOffset);

	const start = editor.document.positionAt(target.start);
	const end = editor.document.positionAt(target.end);
	const range = new vscode.Range(start, end);
	// Place cursor at the 'end' of the error span so the user can hit backspace or fix it
	editor.selection = new vscode.Selection(end, end);
	editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
	return true;
}

function nextTypo(typos: Typo[], cursorOffset: number): Typo {
	return typos.find((typo) => typo.start > cursorOffset) ?? typos[0];
}

function previousTypo(typos: Typo[], cursorOffset: number): Typo {
	for (let index = typos.length - 1; index >= 0; index -= 1) {
		if (typos[index].end < cursorOffset) {
			return typos[index];
		}
	}

	return typos[typos.length - 1];
}
