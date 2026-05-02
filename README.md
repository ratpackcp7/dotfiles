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

## Set and Forget Auto-Sync

### Option 1: Auto-Pull on Terminal Open (Recommended)

**Linux/macOS:** Add to `~/.bashrc` or `~/.zshrc`:
```bash
# Auto-sync OpenCode dotfiles
source ~/dotfiles/bin/auto-sync.sh
```

**Windows:** Add to your PowerShell profile (`$PROFILE`):
```powershell
# Auto-sync OpenCode dotfiles
. $HOME\dotfiles\bin\auto-sync.ps1
```

Now every new terminal silently pulls the latest configs.

### Option 2: Auto-Push Changes

**Linux/macOS** — Run in background:
```bash
nohup ~/dotfiles/bin/auto-push.sh > ~/.dotfiles-sync.log 2>&1 &
```

**Windows** — Run as background job:
```powershell
Start-Job -FilePath "$HOME\dotfiles\bin\auto-push.ps1"
```

This checks every 5 minutes for local changes and auto-commits/pushes them.

### Option 3: Manual Sync (If you prefer control)

```bash
cd ~/dotfiles
git pull   # get updates
git push   # share your changes
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
