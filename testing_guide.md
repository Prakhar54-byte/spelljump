# 🧪 SpellJump Multi-IDE Testing Guide

Since you don't usually use Neovim or JetBrains, here is the easiest way to test your ports on your Arch Linux system.

---

## 1. Testing Neovim Port 🌑

Neovim is already installed on your system. You can test it without changing your personal configuration.

### Steps:
1.  **Navigate to the Neovim port:**
    ```bash
    cd ~/Downloads/spelljump/ports/neovim
    ```
2.  **Launch Neovim with a temporary configuration:**
    Run this command to start Neovim and automatically load the SpellJump plugin:
    ```bash
    nvim --cmd "set rtp+=$(pwd)" --cmd "lua require('spelljump').setup()"
    ```
3.  **How to verify:**
    - Type some typos like `teh`, `recieve`, or `naame`.
    - You should see **yellow warnings** (diagnostics) under the words.
    - Press **Ctrl + Shift + J** to jump to the next typo.
    - Press **Ctrl + Shift + K** to jump to the previous typo.
    - Type `batman` to see the 🦇 message in the notification area.
4.  **To exit:** Type `:q!` and press Enter.

---

---

## 🚀 Deployment

### Neovim
The Neovim port is distributed as a Lua plugin. You can simply push your changes to GitHub, and users can install it using their plugin manager (like lazy.nvim) by pointing to your repository.
