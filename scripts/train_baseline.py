import argparse
import json
import math
from collections import Counter, defaultdict
from pathlib import Path


def features(token: str) -> list[str]:
    lower = token.lower().strip(".,;:")
    repeated = any(lower[index] == lower[index - 1] for index in range(1, len(lower)))
    vowels = sum(1 for char in lower if char in "aeiou")
    return [
        f"len:{min(len(lower), 12)}",
        f"prefix:{lower[:2]}",
        f"suffix:{lower[-2:]}",
        f"repeat:{repeated}",
        f"vowels:{min(vowels, 5)}",
    ]


def train(data_path: str) -> dict:
    label_counts = Counter()
    feature_counts = defaultdict(Counter)
    vocabulary = set()

    with Path(data_path).open(encoding="utf-8") as handle:
        for line in handle:
            row = json.loads(line)
            for token, label in zip(row["tokens"], row["labels"], strict=True):
                label = str(label)
                label_counts[label] += 1
                for feature in features(token):
                    feature_counts[label][feature] += 1
                    vocabulary.add(feature)

    return {
        "labels": dict(label_counts),
        "features": {label: dict(counts) for label, counts in feature_counts.items()},
        "vocabulary": sorted(vocabulary),
    }


def predict(model: dict, token: str) -> tuple[int, float]:
    vocabulary_size = max(len(model["vocabulary"]), 1)
    total_labels = sum(model["labels"].values())
    scores = {}

    for label, label_count in model["labels"].items():
        score = math.log(label_count / total_labels)
        total_features = sum(model["features"][label].values())
        for feature in features(token):
            count = model["features"][label].get(feature, 0)
            score += math.log((count + 1) / (total_features + vocabulary_size))
        scores[label] = score

    best = max(scores, key=scores.get)
    typo_score = scores.get("1", float("-inf"))
    correct_score = scores.get("0", float("-inf"))
    confidence = 1 / (1 + math.exp(correct_score - typo_score))
    return int(best), confidence


def main() -> None:
    parser = argparse.ArgumentParser(description="Train a tiny baseline typo model for local SpellJump inference.")
    parser.add_argument("--data", default="data/spelljump_synthetic.jsonl")
    parser.add_argument("--model", default="model/baseline_spelljump.json")
    parser.add_argument("--text", default="The naame is wrong.")
    args = parser.parse_args()

    model = train(args.data)
    model_path = Path(args.model)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    model_path.write_text(json.dumps(model, indent=2), encoding="utf-8")
    print(f"Saved baseline model to {model_path}")

    offset = 0
    for token in args.text.split():
        start = args.text.index(token, offset)
        end = start + len(token)
        offset = end
        label, confidence = predict(model, token)
        if label == 1:
            print(f"TYPO token={token!r} span=({start},{end}) confidence={confidence:.3f}")


if __name__ == "__main__":
    main()
