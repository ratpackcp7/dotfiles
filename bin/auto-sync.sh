#!/usr/bin/env bash
# Auto-sync OpenCode dotfiles
# Add this to ~/.bashrc or ~/.zshrc:
# source ~/dotfiles/bin/auto-sync.sh

DOTFILES_DIR="$HOME/dotfiles"

# Silently pull latest configs on shell startup
if [ -d "$DOTFILES_DIR/.git" ]; then
    (cd "$DOTFILES_DIR" && git pull --quiet 2>/dev/null &) >/dev/null 2>&1
fi
