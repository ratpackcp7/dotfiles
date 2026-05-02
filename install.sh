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
echo -e "\033[90mTo update: cd $REPO_DIR && git pull\033[0m"
