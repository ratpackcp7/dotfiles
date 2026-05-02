#!/usr/bin/env pwsh
# OpenCode Dotfiles Setup Script for Windows
# Run this once per machine to symlink configs

$ErrorActionPreference = "Stop"

$repoDir = "$HOME\dotfiles"
$opencodeDir = "$HOME\.config\opencode"
$backupDir = "$HOME\.config\opencode.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"

Write-Host "Setting up OpenCode dotfiles..." -ForegroundColor Cyan

# Check if dotfiles repo exists
if (-not (Test-Path $repoDir)) {
    Write-Host "ERROR: ~/dotfiles not found!" -ForegroundColor Red
    Write-Host "Clone it first: git clone https://github.com/ratpackcp7/dotfiles.git $HOME\dotfiles"
    exit 1
}

# Backup existing config if it exists
if (Test-Path $opencodeDir) {
    Write-Host "Backing up existing config to $backupDir..." -ForegroundColor Yellow
    Move-Item -Path $opencodeDir -Destination $backupDir
}

# Create symlink
Write-Host "Creating symlink: $opencodeDir -> $repoDir\opencode" -ForegroundColor Green
New-Item -ItemType SymbolicLink -Path $opencodeDir -Target "$repoDir\opencode" | Out-Null

Write-Host "Done! Your OpenCode config is now synced." -ForegroundColor Green
Write-Host "To update: cd $repoDir && git pull" -ForegroundColor Gray
