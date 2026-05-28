# 🦇 SpellJump

> **AI-powered cursor jump to spelling mistakes in VS Code & Cursor — with hidden DC Batman easter eggs!**

SpellJump is a VS Code / Cursor extension that detects spelling mistakes in real time and jumps the cursor to the exact error span. It shows wavy underlines, diagnostics in the Problems panel, a status bar typo count, and offers quick-fix suggestions.

---

## ⚠️ Availability (Important)

SpellJump is now published exclusively on the Open VSX registry. It is available out-of-the-box for Open VSX–compatible IDEs such as Antigravity IDE, VSCodium, Theia, Eclipse Che, Gitpod, Cursor, and other editors that integrate Open VSX.

- **Not on the Microsoft Marketplace:** This extension is not currently published to the Visual Studio Marketplace.

If you use Visual Studio Code or other editors that expect Marketplace-published extensions, you can still install SpellJump manually by downloading the `.vsix` from Open VSX and installing it locally (steps below).

### Quick install for VS Code / other editors (download & install `.vsix`)

1. Open the Open VSX page for SpellJump: https://open-vsx.org/extension/prakhar-iitj/spelljump
2. Click **Download .vsix** (or use the API/download link on the page).
3. Install the downloaded file:

```bash
# VS Code
code --install-extension ./spelljump-0.1.0.vsix

# VSCodium
codium --install-extension ./spelljump-0.1.0.vsix

# Or use your IDE's extension-install UI to upload the .vsix
```

If you want the extension to appear in an IDE's official registry for automatic installs, consider publishing to that registry (example: Visual Studio Marketplace) — but currently SpellJump is only maintained on Open VSX.

### Adding a README animation (Batman cave)

You can add a small animated GIF that shows bats emerging from a cave for flair. Put the GIF at `assets/batcave-bats.gif` and include it like this:

```markdown
![Batcave — bats emerge](assets/batcave-bats.gif)
```

If you don't have a GIF handy, the `assets/` path and the markdown line above act as a placeholder; add the GIF and commit it to show the animation on the README.

---

## ✨ Features

| Feature | Shortcut |
| --- | --- |
| Jump to **next** typo | `Ctrl+Shift+J` (`Cmd+Shift+J` on Mac) |
| Jump to **previous** typo | `Ctrl+Shift+K` (`Cmd+Shift+K` on Mac) |

- **Real-time diagnostics** — typos appear instantly in the Problems panel.
- **Wavy underlines** — yellow for warnings, red for errors, right in the editor.
- **Status bar counter** — always shows how many typos remain.
- **Offline-first** — low-level TypeScript detector works instantly, no network needed.
- **ONNX model path** — optional DistilBERT fine-tuned model for context-aware detection (Phase 2).

---

## 🦇 Easter Eggs

Type any of the following words in your editor and watch what happens...

> *"It's not who I am underneath, but what I do that defines me."*

<details>
<summary>🤫 Click to reveal the secret words</summary>

| Word | What You'll See |
| --- | --- |
| `batman` | 🦇 I am vengeance. I am the night. I am BATMAN! |
| `joker` | 🃏 Why so serious? |
| `gotham` | 🌃 This city needs a hero. Where is Batman? |
| `alfred` | 🎩 Shall I prepare the Batmobile, sir? |
| `riddler` | ❓ Riddle me this, riddle me that... |
| `catwoman` | 🐱 Meow. The cat burglar strikes again. |
| `robin` | 🐦 Holy typos, Batman! |
| `bane` | 💪 You merely adopted the dark. I was born in it. |
| `arkham` | 🏚️ Welcome to the madhouse. |
| `batcave` | 🦇 Accessing the Batcomputer... Typo detected! |

</details>

---

## 🚀 Installation

### From the VS Code Marketplace (coming soon)

1. Open VS Code → Extensions (`Ctrl+Shift+X`).
2. Search for **SpellJump**.
3. Click **Install**.

### From a `.vsix` file

```bash
code --install-extension spelljump-0.1.0.vsix
```

---

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Compile the extension
pnpm run compile

# Run tests
pnpm run test
```

Press **F5** in VS Code to launch the Extension Development Host with SpellJump loaded.

---

## 🤖 Model Pipeline (Optional — Phase 2)

Generate synthetic typo data:

```bash
python3 scripts/generate_dataset.py --examples 2000 --output data/spelljump_synthetic.jsonl
```

Train and run the local baseline model:

```bash
python3 scripts/train_baseline.py \
  --data data/spelljump_synthetic.jsonl \
  --model model/baseline_spelljump.json \
  --text "The naame is wrong and the langauge setting is broken."
```

Train the DistilBERT model (requires ML dependencies):

```bash
pip install torch transformers datasets accelerate
python3 scripts/train_distilbert.py --data data/spelljump_synthetic.jsonl --out model --epochs 1
python3 scripts/infer_distilbert.py --model model/distilbert-spelljump --text "The naame is wrong."
```

The extension looks for `model/spelljump.onnx`. If `onnxruntime-node` and the ONNX model are not present, it falls back to the low-level detector.

---


## 💬 Feedback & Support

I'd love to hear your thoughts on SpellJump! 

- **⭐ Rate the Extension:** If you're enjoying SpellJump, please consider [leaving a review on Open VSX](https://open-vsx.org/extension/prakhar-iitj/spelljump/reviews).
- **🐛 Report a Bug:** Found a typo that wasn't caught, or a bug in the extension? [Open an issue on GitHub](https://github.com/Prakhar54-byte/spelljump/issues).
- **💡 Feature Requests:** Have an idea for a new feature? Let me know in the [GitHub Issues](https://github.com/Prakhar54-byte/spelljump/issues).

---

## 🧑‍💻 Contributing

1. Fork the repo and create your feature branch (`git checkout -b feat/my-feature`).
2. Make your changes and add tests.
3. Ensure everything passes: `pnpm run compile && pnpm run test`.
4. Open a Pull Request.

CI will automatically run on every push and PR via GitHub Actions.

---

## 📄 License

MIT

---

> *Built with 🦇 by Prakhar, IIT Jodhpur*
