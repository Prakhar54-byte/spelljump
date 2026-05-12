import argparse

import torch
from transformers import DistilBertForTokenClassification, DistilBertTokenizerFast


def main() -> None:
    parser = argparse.ArgumentParser(description="Run SpellJump token inference from a trained checkpoint.")
    parser.add_argument("--model", default="model/distilbert-spelljump")
    parser.add_argument("--text", default="The naame is wrong.")
    args = parser.parse_args()

    tokenizer = DistilBertTokenizerFast.from_pretrained(args.model)
    model = DistilBertForTokenClassification.from_pretrained(args.model)
    inputs = tokenizer(args.text, return_offsets_mapping=True, return_tensors="pt")
    offsets = inputs.pop("offset_mapping")[0].tolist()

    with torch.no_grad():
        logits = model(**inputs).logits[0]
        probabilities = logits.softmax(dim=-1)
        predictions = probabilities.argmax(dim=-1).tolist()

    for token_id, label in enumerate(predictions):
        start, end = offsets[token_id]
        if label == 1 and end > start:
            token = args.text[start:end]
            confidence = probabilities[token_id][1].item()
            print(f"TYPO token={token!r} span=({start},{end}) confidence={confidence:.3f}")


if __name__ == "__main__":
    main()
