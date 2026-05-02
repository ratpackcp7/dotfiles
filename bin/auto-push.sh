#!/usr/bin/env bash
# Auto-push dotfiles when changes detected
# Run this as a background process or systemd service

DOTFILES_DIR="$HOME/dotfiles"
SYNC_INTERVAL=300  # 5 minutes

echo "Starting dotfiles auto-push watcher..."
echo "Watching: $DOTFILES_DIR/opencode/"

while true; do
    sleep $SYNC_INTERVAL
    
    cd "$DOTFILES_DIR"
    
    # Check if there are changes
    if ! git diff --quiet HEAD 2>/dev/null; then
        echo "Changes detected, auto-committing..."
        git add -A
        git commit -m "auto: config sync $(date '+%Y-%m-%d %H:%M:%S')"
        git push
    fi
done
