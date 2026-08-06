# Contributing to SpellJump

Thanks for your interest in improving SpellJump. This project is intentionally small and beginner-friendly, so contributions of all kinds are welcome.

## Ways to contribute

- Report bugs and broken behavior
- Suggest new features or UX improvements
- Improve documentation and examples
- Add tests for existing detector and adaptive-learning logic
- Help with the Neovim or other port integrations

## Code of conduct

Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before participating in the project.

## Development setup

### Prerequisites

- Node.js 20 or 22
- pnpm
- VS Code or Cursor for extension testing

### Install and run locally

```bash
pnpm install
pnpm run compile
pnpm run test
```

To try the extension in a development host:

1. Open the repository in VS Code
2. Press F5 to launch the Extension Development Host
3. Open a file and test the typo-jump behavior

## Project workflow

1. Create a branch for your change
   ```bash
   git checkout -b fix/your-change
   ```
2. Make your change and add or update tests where possible
3. Run the verification commands:
   ```bash
   pnpm run check-types
   pnpm run lint
   pnpm run compile
   pnpm run test
   ```
4. Open a pull request with a clear summary and screenshots if the UI changes

## Coding guidelines

- Keep changes focused and easy to review
- Prefer small, testable functions over large rewrites
- Preserve the existing extension behavior unless the issue specifically calls for a change
- Write descriptive commit messages and PR titles

## Suggested starter issues

If you want a first contribution, these are good places to start:

- Add regression tests for the typo detector and adaptive-learning flow
- Improve false-positive handling for repeated-letter detection in the low-level detector
- Add a command or UI entry to clear the learned dictionary from the current workspace
- Expand the typo dictionary with more common misspellings

## Reporting bugs

When opening an issue, please include:

- What you expected to happen
- What actually happened
- Steps to reproduce
- Your environment (VS Code/Cursor version, OS)

## Pull request checklist

- The change has a clear purpose
- Relevant tests or verification steps were run
- The PR description explains the problem and solution
- The change does not introduce unrelated refactors
