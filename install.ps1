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

# Create junction (Windows equivalent of symlink, no admin needed)
Write-Host "Creating junction: $opencodeDir -> $repoDir\opencode" -ForegroundColor Green
cmd /c mklink /J "$opencodeDir" "$repoDir\opencode" | Out-Null

Write-Host "Done! Your OpenCode config is now synced." -ForegroundColor Green

# Offer to setup auto-sync
$setupAutoSync = Read-Host "Setup auto-sync on terminal startup? (y/n)"
if ($setupAutoSync -eq 'y' -or $setupAutoSync -eq 'Y') {
    $profilePath = $PROFILE
    if (-not (Test-Path $profilePath)) {
        New-Item -ItemType File -Path $profilePath -Force | Out-Null
    }
    
    $autoSyncLine = ". `$HOME\dotfiles\bin\auto-sync.ps1"
    if (-not (Select-String -Path $profilePath -Pattern $autoSyncLine -Quiet)) {
        Add-Content -Path $profilePath -Value "`n# Auto-sync OpenCode dotfiles`n$autoSyncLine"
        Write-Host "Auto-sync enabled! Restart your terminal to activate." -ForegroundColor Green
    } else {
        Write-Host "Auto-sync already configured." -ForegroundColor Yellow
    }
}

Write-Host "`nTo manually sync: cd $repoDir && git pull/push" -ForegroundColor Gray
