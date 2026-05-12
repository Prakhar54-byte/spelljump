import argparse
import json
import random
from pathlib import Path


SEED_SENTENCES = [
    "The function returns the current user name.",
    "Please receive the address before you continue.",
    "Their configuration file contains a language setting.",
    "The grammar checker should highlight the exact typo.",
    "A developer can jump directly to the problem.",
    "This extension runs offline inside the editor.",
    "The quick fix replaces the misspelled token.",
    "Save the document after correcting the sentence.",
]


def inject_typo(word: str) -> str:
    if len(word) < 4:
        return word

    op = random.choice(["double_char", "swap_chars", "drop_char", "insert_char"])
    index = random.randrange(1, len(word) - 1)

    if op == "double_char":
        return word[:index] + word[index] + word[index:]
    if op == "swap_chars":
        chars = list(word)
        chars[index], chars[index + 1] = chars[index + 1], chars[index]
        return "".join(chars)
    if op == "drop_char":
        return word[:index] + word[index + 1 :]
    if op == "insert_char":
        return word[:index] + random.choice("aeiou") + word[index:]

    return word


def corrupt_sentence(sentence: str) -> dict:
    tokens = sentence.split()
    labels = [0] * len(tokens)
    candidates = [i for i, token in enumerate(tokens) if token.strip(".,").isalpha() and len(token.strip(".,")) > 3]
    if not candidates:
        return {"tokens": tokens, "labels": labels}

    count = random.randint(1, min(2, len(candidates)))
    for token_index in random.sample(candidates, count):
        raw = tokens[token_index]
        suffix = ""
        if raw[-1] in ".,;:":
            raw, suffix = raw[:-1], raw[-1]
        tokens[token_index] = inject_typo(raw) + suffix
        labels[token_index] = 1

    return {"tokens": tokens, "labels": labels}


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic token-classification data for SpellJump.")
    parser.add_argument("--output", default="data/spelljump_synthetic.jsonl")
    parser.add_argument("--examples", type=int, default=2000)
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()

    random.seed(args.seed)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)

    with output.open("w", encoding="utf-8") as handle:
        for _ in range(args.examples):
            sentence = random.choice(SEED_SENTENCES)
            handle.write(json.dumps(corrupt_sentence(sentence)) + "\n")

    print(f"Wrote {args.examples} examples to {output}")


if __name__ == "__main__":
    main()
