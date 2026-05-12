## SpellJump — Neovim Port

Same logic as the VS Code extension, written in Lua.

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
