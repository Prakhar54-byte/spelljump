## SpellJump — Neovim Port

Same logic as the VS Code extension, written in Lua.

**Deployment:** This port is also published to the Open VSX registry and can be installed in any Open VSX-compatible IDE (for example: Anitgravity and other IDEs that support Open VSX).

**Note about VS Code and cursor-type IDEs:** The Open VSX package can be installed directly in Open VSX-compatible IDEs. If you're using VS Code (the Microsoft distribution) or other "cursor-type" IDEs that do not automatically support Open VSX, you will need to download the extension manually from the Open VSX registry and install it into your editor.

### Install with lazy.nvim

Add this to your `~/.config/nvim/lua/plugins/spelljump.lua`:

```lua
return {
  dir = "~/Downloads/spelljump/ports/neovim",  -- local path to this port
  name = "spelljump",
  config = function()
    require("spelljump").setup({
      debounce_ms = 350,     -- how long to wait after typing before scanning
      next_key    = "<C-S-j>",  -- Ctrl+Shift+J — jump to next typo
      prev_key    = "<C-S-k>",  -- Ctrl+Shift+K — jump to previous typo
    })
  end,
}
```

Then reload Neovim and run `:Lazy sync`.

### Install with packer.nvim

```lua
use {
  "~/Downloads/spelljump/ports/neovim",
  config = function()
    require("spelljump").setup()
  end
}
```

### Manual install (no plugin manager)

```bash
mkdir -p ~/.local/share/nvim/site/pack/spelljump/start/spelljump/lua/spelljump
cp ~/Downloads/spelljump/ports/neovim/lua/spelljump/init.lua \
   ~/.local/share/nvim/site/pack/spelljump/start/spelljump/lua/spelljump/init.lua
```

Then add this to your `~/.config/nvim/init.lua`:

```lua
require("spelljump").setup()
```

### Usage

| Key            | Action                        |
| ---            | ---                           |
| `Ctrl+Shift+J` | Jump to next typo             |
| `Ctrl+Shift+K` | Jump to previous typo         |

Typos appear as **warnings** in the diagnostics panel (`:lua vim.diagnostic.open_float()`).

Try typing `batman` or `joker` for a surprise 🦇

---

**Batman animation (README)**

Below is a simple, fun ASCII "Batman" art to show in the README as a playful animation/frame. It's static here, but you can replace it with an animated GIF in future releases.

```text
         _.--""-._
       ."  _    _ `.
      /   (_)  (_)  \
     |  ,           ,|
     |  \`.       .'/ |
      \  `.`-._.-'.'  /
       `-._`"---"'_.-'
            `-----'
        B A T M A N  🦇
```

If you publish an animated GIF or SVG later, replace the block above with an image link so it animates on supported renderers.

---

**Install via Open VSX / Anitgravity**

- To install from the Open VSX registry, search for "spelljump" on https://open-vsx.org and follow the IDE-specific install flow.
- In Anitgravity and other Open VSX-compatible IDEs: open your IDE's Extensions view, choose "Install from Open VSX", search for `spelljump`, and install.
- For VS Code (official Microsoft build) or other editors without Open VSX support: download the .vsix from Open VSX and then install it manually via the editor's "Install from VSIX" command.

If you'd like, I can add a hosted animated GIF and a direct Open VSX badge to the top of this README — tell me if you have an image to use or want me to add one from a public source.
