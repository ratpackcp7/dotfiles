#!/usr/bin/env bash
# OpenCode Dotfiles Setup Script for Linux/macOS
# Run this once per machine to symlink configs

set -e

REPO_DIR="$HOME/dotfiles"
OPENCODE_DIR="$HOME/.config/opencode"
BACKUP_DIR="$HOME/.config/opencode.backup.$(date +%Y%m%d-%H%M%S)"

echo -e "\033[36mSetting up OpenCode dotfiles...\033[0m"

# Check if dotfiles repo exists
if [ ! -d "$REPO_DIR" ]; then
    echo -e "\033[31mERROR: ~/dotfiles not found!\033[0m"
    echo "Clone it first: git clone https://github.com/ratpackcp7/dotfiles.git ~/dotfiles"
    exit 1
fi

# Backup existing config if it exists
if [ -d "$OPENCODE_DIR" ] && [ ! -L "$OPENCODE_DIR" ]; then
    echo -e "\033[33mBacking up existing config to $BACKUP_DIR...\033[0m"
    mv "$OPENCODE_DIR" "$BACKUP_DIR"
fi

# Remove existing symlink if broken
if [ -L "$OPENCODE_DIR" ] && [ ! -e "$OPENCODE_DIR" ]; then
    rm "$OPENCODE_DIR"
fi

# Create symlink
echo -e "\033[32mCreating symlink: $OPENCODE_DIR -> $REPO_DIR/opencode\033[0m"
ln -sfn "$REPO_DIR/opencode" "$OPENCODE_DIR"

echo -e "\033[32mDone! Your OpenCode config is now synced.\033[0m"

# Offer to setup auto-sync
read -p "Setup auto-sync on terminal startup? (y/n) " setup_auto_sync
if [ "$setup_auto_sync" = "y" ] || [ "$setup_auto_sync" = "Y" ]; then
    shell_rc="$HOME/.bashrc"
    if [ -f "$HOME/.zshrc" ]; then
        shell_rc="$HOME/.zshrc"
    fi
    
    auto_sync_line="source $REPO_DIR/bin/auto-sync.sh"
    if ! grep -q "$auto_sync_line" "$shell_rc" 2>/dev/null; then
        echo "" >> "$shell_rc"
        echo "# Auto-sync OpenCode dotfiles" >> "$shell_rc"
        echo "$auto_sync_line" >> "$shell_rc"
        echo -e "\033[32mAuto-sync enabled in $shell_rc! Run: source $shell_rc\033[0m"
    else
        echo -e "\033[33mAuto-sync already configured.\033[0m"
    fi
fi

echo -e "\033[90mTo manually sync: cd $REPO_DIR && git pull/push\033[0m"
