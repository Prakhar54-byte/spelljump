-- =============================================================================
-- spelljump.nvim — Neovim port of SpellJump
-- Same detection logic as the VS Code extension (TypeScript → Lua)
-- Usage: Requires lazy.nvim or packer.nvim. See README inside ports/neovim/
-- =============================================================================

local M = {}

-- ─── Known Corrections (same map as detector.ts) ─────────────────────────────
local KNOWN_CORRECTIONS = {
  adress    = { fix = "address",   message = "Common spelling mistake." },
  recieve   = { fix = "receive",   message = "Use i before e here." },
  teh       = { fix = "the",       message = "Letters appear swapped." },
  occured   = { fix = "occurred",  message = "Common spelling mistake." },
  seperate  = { fix = "separate",  message = "Common spelling mistake." },
  definately= { fix = "definitely",message = "Common spelling mistake." },
  wierd     = { fix = "weird",     message = "Common spelling mistake." },
  theirr    = { fix = "their",     message = "Possible extra character." },
  thier     = { fix = "their",     message = "Letters appear swapped." },
  grammer   = { fix = "grammar",   message = "Common spelling mistake." },
  langauge  = { fix = "language",  message = "Letters appear swapped." },
  funtion   = { fix = "function",  message = "Possible missing character." },
  naame     = { fix = "name",      message = "Possible extra character." },
}

-- 🦇 DC Batman Easter Eggs (same as detector.ts)
local BATMAN_EGGS = {
  batman   = { fix = "Bruce Wayne",             message = "🦇 I am vengeance. I am the night. I am BATMAN!" },
  joker    = { fix = "Clown Prince of Crime",   message = "🃏 Why so serious?" },
  gotham   = { fix = "Gotham City",             message = "🌃 This city needs a hero. Where is Batman?" },
  alfred   = { fix = "Alfred Pennyworth",       message = "🎩 Shall I prepare the Batmobile, sir?" },
  riddler  = { fix = "Edward Nygma",            message = "❓ Riddle me this, riddle me that..." },
  catwoman = { fix = "Selina Kyle",             message = "🐱 Meow. The cat burglar strikes again." },
  robin    = { fix = "Boy Wonder",              message = "🐦 Holy typos, Batman!" },
  bane     = { fix = "The Man Who Broke the Bat", message = "💪 You merely adopted the dark. I was born in it." },
  arkham   = { fix = "Arkham Asylum",           message = "🏚️ Welcome to the madhouse." },
  batcave  = { fix = "The Batcave",             message = "🦇 Accessing the Batcomputer... Typo detected!" },
}



-- ─── Core detection logic (mirrors findAllSuspiciousRepeats) ─────────────────
local function find_suspicious_repeats(word)
  local indices = {}
  local in_run = false
  for i = 2, #word do
    local cur  = word:sub(i, i):lower()
    local prev = word:sub(i-1, i-1):lower()
    
    -- Check for triple repeat (e.g., baaaad)
    local is_triple = i > 2 and word:sub(i-2, i-2):lower() == cur
    
    if cur == prev then
      if is_triple and not in_run then
        table.insert(indices, i - 2) -- 1-indexed position of first char in run
        in_run = true
      end
    else
      in_run = false
    end
  end
  return indices
end

-- ─── Main detection (same as detectLowLevelTypos) ────────────────────────────
local function detect_typos(text)
  local typos = {}
  -- Iterate over every word in the buffer text
  for start_pos, word in text:gmatch("()([A-Za-z][A-Za-z']*[A-Za-z]?)") do
    local lower = word:lower()

    -- 1) Check known corrections
    local correction = KNOWN_CORRECTIONS[lower]
    if correction then
      table.insert(typos, {
        word    = word,
        start   = start_pos - 1,  -- convert to 0-indexed for nvim API
        finish  = start_pos - 1 + #word,
        message = correction.message,
        fix     = correction.fix,
        kind    = "known",
      })
      goto continue
    end

    -- 2) Check Batman easter eggs 🦇
    local egg = BATMAN_EGGS[lower]
    if egg then
      table.insert(typos, {
        word    = word,
        start   = start_pos - 1,
        finish  = start_pos - 1 + #word,
        message = egg.message,
        fix     = egg.fix,
        kind    = "egg",
      })
      goto continue
    end

    -- 3) Detect suspicious repeated characters
    local repeats = find_suspicious_repeats(word)
    for _, rep_idx in ipairs(repeats) do
      local err_start = start_pos - 1 + rep_idx - 1
      table.insert(typos, {
        word    = word,
        start   = err_start,
        finish  = err_start + 1,
        message = string.format('Suspicious repeated "%s".', word:sub(rep_idx, rep_idx)),
        fix     = word:sub(1, rep_idx - 1) .. word:sub(rep_idx + 1),
        kind    = "repeat",
      })
    end

    ::continue::
  end

  table.sort(typos, function(a, b) return a.start < b.start end)
  return typos
end

-- ─── State ───────────────────────────────────────────────────────────────────
local state = {
  typos     = {},
  ns_id     = vim.api.nvim_create_namespace("spelljump"),
  timer     = nil,
}

-- ─── Diagnostics via vim.diagnostic ──────────────────────────────────────────
local function refresh(bufnr)
  bufnr = bufnr or vim.api.nvim_get_current_buf()
  local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)
  local text  = table.concat(lines, "\n")

  state.typos = detect_typos(text)

  -- Build vim.diagnostic items
  local diags = {}
  for _, t in ipairs(state.typos) do
    -- Convert flat offset → (row, col)
    local offset = t.start
    local row, col = 0, 0
    for i, line in ipairs(lines) do
      local line_len = #line + 1  -- +1 for the newline
      if offset < line_len then
        row = i - 1
        col = offset
        break
      end
      offset = offset - line_len
    end
    local end_offset = t.finish
    local end_row, end_col = row, end_offset - t.start + col
    table.insert(diags, {
      lnum     = row,
      col      = col,
      end_lnum = end_row,
      end_col  = end_col,
      severity = vim.diagnostic.severity.WARN,
      message  = t.message .. (t.fix and ("  →  " .. t.fix) or ""),
      source   = "SpellJump 🦇",
    })
  end

  vim.diagnostic.set(state.ns_id, bufnr, diags, {})
end

-- ─── Jump logic (mirrors jumper.ts) ──────────────────────────────────────────
local function jump(direction)
  local bufnr  = vim.api.nvim_get_current_buf()
  local cursor = vim.api.nvim_win_get_cursor(0)  -- {row (1-based), col (0-based)}
  local lines  = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)

  -- Calculate flat cursor offset
  local cursor_offset = 0
  for i = 1, cursor[1] - 1 do
    cursor_offset = cursor_offset + #lines[i] + 1
  end
  cursor_offset = cursor_offset + cursor[2]

  refresh(bufnr)

  if #state.typos == 0 then
    vim.notify("SpellJump: no typos found 🦇", vim.log.levels.INFO)
    return
  end

  local target = nil
  if direction == "next" then
    for _, t in ipairs(state.typos) do
      if t.start > cursor_offset then
        target = t
        break
      end
    end
    if not target then target = state.typos[1] end  -- wrap around
  else
    for i = #state.typos, 1, -1 do
      if state.typos[i].finish < cursor_offset then
        target = state.typos[i]
        break
      end
    end
    if not target then target = state.typos[#state.typos] end
  end

  -- Convert flat offset back to (row, col)
  local rem = target.finish  -- place cursor at END of error span (like jumper.ts)
  for i, line in ipairs(lines) do
    local line_len = #line + 1
    if rem < line_len then
      vim.api.nvim_win_set_cursor(0, { i, rem })
      vim.notify("SpellJump 🦇: " .. target.message, vim.log.levels.WARN)
      return
    end
    rem = rem - line_len
  end
end

-- ─── Setup (call this in your init.lua) ──────────────────────────────────────
function M.setup(opts)
  opts = opts or {}
  local debounce_ms = opts.debounce_ms or 350

  -- Auto-refresh diagnostics on text change (with debounce)
  vim.api.nvim_create_autocmd({ "TextChanged", "TextChangedI", "BufEnter" }, {
    callback = function()
      if state.timer then
        state.timer:stop()
        state.timer:close()
      end
      state.timer = vim.loop.new_timer()
      state.timer:start(debounce_ms, 0, vim.schedule_wrap(function()
        refresh()
      end))
    end,
  })

  -- Keymaps (Ctrl+Shift+J / Ctrl+Shift+K — same as VS Code extension)
  local next_key = opts.next_key or "<C-S-j>"
  local prev_key = opts.prev_key or "<C-S-k>"
  vim.keymap.set("n", next_key, function() jump("next")     end, { desc = "SpellJump: Next Typo" })
  vim.keymap.set("n", prev_key, function() jump("previous") end, { desc = "SpellJump: Previous Typo" })

  -- Initial scan
  vim.schedule(refresh)

  vim.notify("🦇 SpellJump is active! Press " .. next_key .. " to jump to the next typo.", vim.log.levels.INFO)
end

return M
