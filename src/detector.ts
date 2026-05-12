export type TypoSeverity = 'warning' | 'error';

export interface Typo {
	word: string;
	start: number;
	end: number;
	message: string;
	suggestion?: string;
	severity: TypoSeverity;
	confidence: number;
}

export interface TypoDetector {
	detect(text: string): Promise<Typo[]>;
}

interface KnownCorrection {
	fix: string;
	message: string;
}

const knownCorrections = new Map<string, KnownCorrection>([
	['adress', { fix: 'address', message: 'Common spelling mistake.' }],
	['recieve', { fix: 'receive', message: 'Use i before e here.' }],
	['teh', { fix: 'the', message: 'Letters appear swapped.' }],
	['occured', { fix: 'occurred', message: 'Common spelling mistake.' }],
	['seperate', { fix: 'separate', message: 'Common spelling mistake.' }],
	['definately', { fix: 'definitely', message: 'Common spelling mistake.' }],
	['wierd', { fix: 'weird', message: 'Common spelling mistake.' }],
	['theirr', { fix: 'their', message: 'Possible extra character.' }],
	['thier', { fix: 'their', message: 'Letters appear swapped.' }],
	['grammer', { fix: 'grammar', message: 'Common spelling mistake.' }],
	['langauge', { fix: 'language', message: 'Letters appear swapped.' }],
	['funtion', { fix: 'function', message: 'Possible missing character.' }],
	['naame', { fix: 'name', message: 'Possible extra character.' }],
]);

// 🦇 DC Batman Easter Eggs — hidden treats for fans who type these words
const batmanEasterEggs = new Map<string, KnownCorrection>([
	['batman', { fix: 'Bruce Wayne', message: '🦇 I am vengeance. I am the night. I am BATMAN!' }],
	['joker', { fix: 'Clown Prince of Crime', message: '🃏 Why so serious?' }],
	['gotham', { fix: 'Gotham City', message: '🌃 This city needs a hero. Where is Batman?' }],
	['alfred', { fix: 'Alfred Pennyworth', message: '🎩 Shall I prepare the Batmobile, sir?' }],
	['riddler', { fix: 'Edward Nygma', message: '❓ Riddle me this, riddle me that...' }],
	['catwoman', { fix: 'Selina Kyle', message: '🐱 Meow. The cat burglar strikes again.' }],
	['robin', { fix: 'Boy Wonder', message: '🐦 Holy typos, Batman!' }],
	['bane', { fix: 'The Man Who Broke the Bat', message: '💪 You merely adopted the dark. I was born in it.' }],
	['arkham', { fix: 'Arkham Asylum', message: '🏚️ Welcome to the madhouse.' }],
	['batcave', { fix: 'The Batcave', message: '🦇 Accessing the Batcomputer... Typo detected!' }],
]);

const wordPattern = /[A-Za-z][A-Za-z']*[A-Za-z]|[A-Za-z]/g;

export class LowLevelTypoDetector implements TypoDetector {
	public async detect(text: string): Promise<Typo[]> {
		return detectLowLevelTypos(text);
	}
}

export function detectLowLevelTypos(text: string): Typo[] {
	const typos: Typo[] = [];
	let match: RegExpExecArray | null;

	while ((match = wordPattern.exec(text)) !== null) {
		const word = match[0];
		const start = match.index;
		const lower = word.toLowerCase();
		const correction = knownCorrections.get(lower);

		if (correction) {
			typos.push({
				word,
				start,
				end: start + word.length,
				message: correction.message,
				suggestion: preserveCase(word, correction.fix),
				severity: 'warning',
				confidence: 0.95,
			});
			continue;
		}

		// 🦇 Batman Easter Egg check
		const egg = batmanEasterEggs.get(lower);
		if (egg) {
			typos.push({
				word,
				start,
				end: start + word.length,
				message: egg.message,
				suggestion: egg.fix,
				severity: 'warning',
				confidence: 1.0,
			});
			continue;
		}
		const repeats = findAllSuspiciousRepeats(word);
		for (const repeated of repeats) {
			const errorStart = start + repeated;
			typos.push({
				word,
				start: errorStart,
				end: errorStart + 1,
				message: `Suspicious repeated "${word[repeated]}".`,
				suggestion: word.slice(0, repeated) + word.slice(repeated + 1),
				severity: 'warning',
				confidence: 0.72,
			});
		}
	}

	return typos.sort((a, b) => a.start - b.start);
}

function findAllSuspiciousRepeats(word: string): number[] {
	const indices: number[] = [];
	let inRepeatRun = false;
	for (let index = 1; index < word.length; index += 1) {
		const current = word[index].toLowerCase();
		const previous = word[index - 1].toLowerCase();
		if (current === previous && !isAllowedDoubleLetter(word, index - 1)) {
			if (!inRepeatRun) {
				// Only report the first position of a consecutive repeat run
				indices.push(index - 1);
				inRepeatRun = true;
			}
		} else {
			inRepeatRun = false;
		}
	}
	return indices;
}

function isAllowedDoubleLetter(word: string, index: number): boolean {
	const pair = word.slice(index, index + 2).toLowerCase();
	const allowed = new Set(['ll', 'ss', 'ee', 'oo', 'tt', 'ff', 'rr', 'nn', 'mm', 'pp', 'cc', 'dd']);
	return allowed.has(pair);
}

function preserveCase(source: string, replacement: string): string {
	if (source.toUpperCase() === source) {
		return replacement.toUpperCase();
	}

	if (source[0].toUpperCase() === source[0]) {
		return replacement[0].toUpperCase() + replacement.slice(1);
	}

	return replacement;
}
