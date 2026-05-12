import argparse
import inspect
import json
from pathlib import Path

import torch
from torch import nn
from datasets import Dataset
from transformers import (
    DataCollatorForTokenClassification,
    DistilBertForTokenClassification,
    DistilBertTokenizerFast,
    Trainer,
    TrainingArguments,
)


class OnnxTokenClassifier(nn.Module):
    def __init__(self, model: DistilBertForTokenClassification) -> None:
        super().__init__()
        self.model = model

    def forward(self, input_ids: torch.Tensor, attention_mask: torch.Tensor) -> torch.Tensor:
        return self.model(input_ids=input_ids, attention_mask=attention_mask).logits


def load_jsonl(path: str) -> Dataset:
    rows = []
    with Path(path).open(encoding="utf-8") as handle:
        for line in handle:
            rows.append(json.loads(line))
    return Dataset.from_list(rows)


def tokenize_and_align(tokenizer: DistilBertTokenizerFast, batch: dict) -> dict:
    tokenized = tokenizer(batch["tokens"], truncation=True, is_split_into_words=True)
    labels = []
    word_ids = tokenized.word_ids()
    previous_word_id = None

    for word_id in word_ids:
        if word_id is None:
            labels.append(-100)
        elif word_id != previous_word_id:
            labels.append(batch["labels"][word_id])
        else:
            labels.append(-100)
        previous_word_id = word_id

    tokenized["labels"] = labels
    return tokenized


def make_training_args(output_dir: Path, epochs: float) -> TrainingArguments:
    kwargs = {
        "output_dir": str(output_dir / "checkpoints"),
        "learning_rate": 2e-5,
        "per_device_train_batch_size": 16,
        "per_device_eval_batch_size": 16,
        "num_train_epochs": epochs,
        "weight_decay": 0.01,
        "save_strategy": "epoch",
        "logging_steps": 20,
    }
    parameters = inspect.signature(TrainingArguments.__init__).parameters
    if "evaluation_strategy" in parameters:
        kwargs["evaluation_strategy"] = "epoch"
    elif "eval_strategy" in parameters:
        kwargs["eval_strategy"] = "epoch"

    return TrainingArguments(**kwargs)


def make_trainer(
    model: DistilBertForTokenClassification,
    training_args: TrainingArguments,
    train_dataset: Dataset,
    eval_dataset: Dataset,
    tokenizer: DistilBertTokenizerFast,
) -> Trainer:
    kwargs = {
        "model": model,
        "args": training_args,
        "train_dataset": train_dataset,
        "eval_dataset": eval_dataset,
        "data_collator": DataCollatorForTokenClassification(tokenizer),
    }
    parameters = inspect.signature(Trainer.__init__).parameters
    if "tokenizer" in parameters:
        kwargs["tokenizer"] = tokenizer
    elif "processing_class" in parameters:
        kwargs["processing_class"] = tokenizer

    return Trainer(**kwargs)


def main() -> None:
    parser = argparse.ArgumentParser(description="Fine-tune DistilBERT for SpellJump typo detection.")
    parser.add_argument("--data", default="data/spelljump_synthetic.jsonl")
    parser.add_argument("--out", default="model")
    parser.add_argument("--epochs", type=float, default=1)
    parser.add_argument("--skip-onnx", action="store_true")
    args = parser.parse_args()

    output_dir = Path(args.out)
    output_dir.mkdir(parents=True, exist_ok=True)

    tokenizer = DistilBertTokenizerFast.from_pretrained("distilbert-base-uncased")
    model = DistilBertForTokenClassification.from_pretrained(
        "distilbert-base-uncased",
        num_labels=2,
        attn_implementation="eager",
    )
    model.config._attn_implementation = "eager"
    dataset = load_jsonl(args.data)
    split = dataset.train_test_split(test_size=0.15, seed=7)
    encoded = split.map(lambda row: tokenize_and_align(tokenizer, row), remove_columns=["tokens", "labels"])

    training_args = make_training_args(output_dir, args.epochs)

    trainer = make_trainer(model, training_args, encoded["train"], encoded["test"], tokenizer)
    trainer.train()
    trainer.save_model(str(output_dir / "distilbert-spelljump"))
    tokenizer.save_pretrained(str(output_dir / "distilbert-spelljump"))

    if args.skip_onnx:
        print("Skipped ONNX export.")
        return

    dummy = tokenizer("The naame is wrong.", return_tensors="pt")
    export_kwargs = {
        "input_names": ["input_ids", "attention_mask"],
        "output_names": ["logits"],
        "dynamic_axes": {
            "input_ids": {0: "batch", 1: "sequence"},
            "attention_mask": {0: "batch", 1: "sequence"},
            "logits": {0: "batch", 1: "sequence"},
        },
        "opset_version": 17,
    }
    if "dynamo" in inspect.signature(torch.onnx.export).parameters:
        export_kwargs["dynamo"] = False

    model.eval()
    onnx_model = OnnxTokenClassifier(model)
    try:
        torch.onnx.export(
            onnx_model,
            (dummy["input_ids"], dummy["attention_mask"]),
            str(output_dir / "spelljump.onnx"),
            **export_kwargs,
        )
        print(f"Exported ONNX model to {output_dir / 'spelljump.onnx'}")
    except Exception as error:
        print(f"ONNX export failed: {error}")
        print("Training checkpoint is still saved. Re-run with --skip-onnx for checkpoint-only training.")


if __name__ == "__main__":
    main()
