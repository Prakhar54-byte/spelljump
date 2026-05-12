import * as vscode from 'vscode';

export class SpellJumpStatusBar {
	private readonly item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

	public constructor() {
		this.item.command = 'spelljump.jumpToNext';
		this.item.tooltip = 'Jump to the next SpellJump finding';
	}

	public update(count: number): void {
		this.item.text = count === 0 ? 'SpellJump: 0' : `SpellJump: ${count}`;
		this.item.show();
	}

	public dispose(): void {
		this.item.dispose();
	}
}
