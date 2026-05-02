# dotfiles

Personal dotfiles repo for syncing OpenCode configuration across machines.

## Quick Start

### Windows

```powershell
# 1. Clone this repo
git clone https://github.com/ratpackcp7/dotfiles.git $HOME\dotfiles

# 2. Run installer
cd $HOME\dotfiles
.\install.ps1
```

### Linux / macOS

```bash
# 1. Clone this repo
git clone https://github.com/ratpackcp7/dotfiles.git ~/dotfiles

# 2. Run installer
cd ~/dotfiles
./install.sh
```

## What's Included

- `opencode/opencode.json` — Global OpenCode settings (model, permissions, theme)
- `opencode/tui.json` — Terminal UI preferences (keybinds, scroll speed)
- `opencode/skills/` — Custom OpenCode skills (empty, add your own)
- `opencode/agents/` — Custom agents (empty, add your own)

## Keeping Synced

**Pull latest configs:**
```bash
cd ~/dotfiles && git pull
```

**Push local changes:**
```bash
cd ~/dotfiles
git add -A
git commit -m "update opencode config"
git push
```

## Security Notes

- API keys are **not** stored in this repo
- Use environment variables: `{env:ANTHROPIC_API_KEY}` in `opencode.json`
- Set keys in your shell profile (`.bashrc`, `.zshrc`, etc.)

## Supported Platforms

- Windows (PowerShell)
- Linux
- macOS

---

Managed with ❤️ by [ratpackcp7](https://github.com/ratpackcp7)
