#!/usr/bin/env pwsh
# Auto-sync OpenCode dotfiles for Windows
# Add to your PowerShell profile:
# . $HOME\dotfiles\bin\auto-sync.ps1

$dotfilesDir = "$HOME\dotfiles"

# Silently pull latest configs on shell startup
if (Test-Path "$dotfilesDir\.git") {
    Start-Job -ScriptBlock {
        Set-Location $using:dotfilesDir
        git pull --quiet 2>$null
    } | Out-Null
}
