import * as vscode from 'vscode';

export class SpellJumpStatusBar {
	private readonly item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	private readonly adaptiveItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);

	public constructor() {
		this.item.command = 'spelljump.jumpToNext';
		this.item.tooltip = 'Jump to the next SpellJump finding';

		this.adaptiveItem.command = 'spelljump.toggleAdaptiveLearning';
		this.adaptiveItem.tooltip = 'Toggle SpellJump Adaptive Learning (click to toggle)';
		this.adaptiveItem.show();
	}

	public update(count: number): void {
		this.item.text = count === 0 ? '🦇 SpellJump: ✓' : `🦇 SpellJump: ${count} typo${count === 1 ? '' : 's'}`;
		this.item.show();
	}

	public updateAdaptiveMode(enabled: boolean): void {
		this.adaptiveItem.text = enabled ? '$(brain) Adaptive: ON' : '$(circle-slash) Adaptive: OFF';
		this.adaptiveItem.color = enabled ? new vscode.ThemeColor('statusBarItem.prominentForeground') : undefined;
	}

	public dispose(): void {
		this.item.dispose();
		this.adaptiveItem.dispose();
	}
}
