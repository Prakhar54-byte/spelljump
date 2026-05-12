## SpellJump — JetBrains Port

Same logic as the VS Code extension, written in Kotlin for IntelliJ IDEA, PyCharm, WebStorm, and all other JetBrains IDEs.

### Prerequisites on Arch Linux

```bash
# Install JDK 17 (required by the IntelliJ plugin SDK)
sudo pacman -S jdk17-openjdk

# Install Gradle (build tool)
sudo pacman -S gradle
```

### Set JAVA_HOME (required on Arch Linux — do this once)

```bash
# Add this to your ~/.zshrc so you don't have to type it every time
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
```

Then reload your shell:
```bash
source ~/.zshrc
```

### Build & Run Locally (for testing)

```bash
cd ~/Downloads/spelljump/ports/jetbrains

# Run a sandboxed IntelliJ instance with the plugin loaded
./gradlew runIde
```

This downloads IntelliJ CE (~700MB first time) and launches it with SpellJump active.
You can then open any file and test the jump shortcuts!

### Build a distributable `.zip`

```bash
./gradlew buildPlugin
```

The output will be in `build/distributions/SpellJump-0.2.0.zip`.

### Manual Install in any JetBrains IDE

1. Open any JetBrains IDE (IntelliJ, PyCharm, WebStorm etc.)
2. Go to **File → Settings → Plugins**.
3. Click the **gear icon ⚙️** → **Install Plugin from Disk...**.
4. Select the `SpellJump-0.2.0.zip` file you built above.
5. Restart the IDE.

### Usage

| Key | Action |
| --- | --- |
| `Ctrl+Shift+J` | Jump to next typo |
| `Ctrl+Shift+K` | Jump to previous typo |

Typos appear as **yellow wavy underlines**. Hover over them to see the message and a quick-fix suggestion.

Try typing `batman`, `joker`, or `gotham` for a surprise 🦇

### Publish to JetBrains Marketplace

```bash
# Get a token from: https://plugins.jetbrains.com/author/me/tokens
export PUBLISH_TOKEN="your-token-here"
./gradlew publishPlugin
```
