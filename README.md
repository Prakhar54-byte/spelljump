# 🦇 SpellJump

> **AI-powered cursor jump to spelling mistakes in VS Code & Cursor — with hidden DC Batman easter eggs!**

SpellJump is a VS Code / Cursor extension that detects spelling mistakes in real time and jumps the cursor to the exact error span. It shows wavy underlines, diagnostics in the Problems panel, a status bar typo count, and offers quick-fix suggestions.

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

## 📦 Deployment & Publishing

If you want to share your extension with the world, you have three great options.

### Option 1: GitHub Releases (Easiest)
You can distribute the `.vsix` file directly through GitHub.
1. Run `vsce package` to generate `spelljump-0.1.0.vsix`.
2. Go to your GitHub repository and click **Releases** -> **Draft a new release**.
3. Upload the `.vsix` file as an asset. Users can download it and install it manually via `code --install-extension`.

### Option 2: Open VSX Registry (Recommended Alternative)
Open VSX is the open-source alternative to the Microsoft Marketplace (used by Cursor, VSCodium, Gitpod). **It only requires a GitHub account!**
1. Install the CLI: `npm install -g ovsx`
2. Log in to [open-vsx.org](https://open-vsx.org/) with your GitHub account.
3. Go to your Settings page and generate an Access Token.
4. Create a namespace matching your publisher ID (`prakhar-iitj`).
5. Publish: `ovsx publish spelljump-0.1.0.vsix -p <YOUR_TOKEN>`

### Option 3: VS Code Marketplace (Microsoft Account Required)
1. Install the CLI: `npm install -g @vscode/vsce`
2. Create a publisher account at the [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage).
3. Generate a Personal Access Token from [Azure DevOps](https://dev.azure.com/).
4. Log in and publish:
   ```bash
   vsce login <your-publisher-id>
   vsce publish
   ```
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
