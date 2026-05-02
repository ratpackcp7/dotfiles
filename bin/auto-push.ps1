#!/usr/bin/env pwsh
# Auto-push dotfiles when changes detected (Windows)
# Run this as a scheduled task or background job

$dotfilesDir = "$HOME\dotfiles"
$syncInterval = 300  # 5 minutes

Write-Host "Starting dotfiles auto-push watcher..."
Write-Host "Watching: $dotfilesDir\opencode\"

while ($true) {
    Start-Sleep -Seconds $syncInterval
    
    Set-Location $dotfilesDir
    
    # Check if there are changes
    $status = git status --porcelain 2>$null
    if ($status) {
        Write-Host "Changes detected, auto-committing..."
        git add -A
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        git commit -m "auto: config sync $timestamp"
        git push
    }
}
