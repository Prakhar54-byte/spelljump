import * as assert from 'assert';

import * as vscode from 'vscode';
import { detectLowLevelTypos } from '../detector';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('detects known corrections', () => {
		const typos = detectLowLevelTypos('The naame is wrong.');

		assert.strictEqual(typos.length, 1);
		assert.strictEqual(typos[0].word, 'naame');
		assert.strictEqual(typos[0].suggestion, 'name');
		assert.strictEqual(typos[0].start, 4);
	});

	test('selects the extra repeated character inside a word', () => {
		const typos = detectLowLevelTypos('Fix the baaasic case.');

		assert.strictEqual(typos.length, 1);
		assert.strictEqual(typos[0].start, 9);
		assert.strictEqual(typos[0].end, 10);
	});

	// 🦇 DC Batman Easter Egg Tests
	test('triggers batman easter egg', () => {
		const typos = detectLowLevelTypos('I am batman forever.');

		assert.strictEqual(typos.length, 1);
		assert.strictEqual(typos[0].word, 'batman');
		assert.ok(typos[0].message.includes('I am vengeance'));
		assert.strictEqual(typos[0].suggestion, 'Bruce Wayne');
	});

	test('triggers joker easter egg', () => {
		const typos = detectLowLevelTypos('The joker laughed.');

		assert.strictEqual(typos.length, 1);
		assert.strictEqual(typos[0].word, 'joker');
		assert.ok(typos[0].message.includes('Why so serious'));
	});

	test('triggers gotham easter egg', () => {
		const typos = detectLowLevelTypos('Welcome to gotham tonight.');

		assert.strictEqual(typos.length, 1);
		assert.strictEqual(typos[0].word, 'gotham');
		assert.ok(typos[0].message.includes('Batman'));
	});

	test('triggers alfred easter egg', () => {
		const typos = detectLowLevelTypos('Call alfred now.');

		assert.strictEqual(typos.length, 1);
		assert.strictEqual(typos[0].word, 'alfred');
		assert.ok(typos[0].message.includes('Batmobile'));
	});

	test('does not flag allowed double letters', () => {
		const typos = detectLowLevelTypos('Success is good.');

		assert.strictEqual(typos.length, 0);
	});
});
