param(
    [Parameter(Mandatory = $true)]
    [string]$Message
)

# 1. Increment version
Write-Host "--- Incrementing version ---" -ForegroundColor Cyan
& ".\increment_version.ps1"

# 2. Git add
Write-Host "--- Staging changes ---" -ForegroundColor Cyan
git add .

# 3. Git commit
Write-Host "--- Committing changes ---" -ForegroundColor Cyan
git commit -m $Message

# 4. Git push
Write-Host "--- Pushing to GitHub ---" -ForegroundColor Cyan
git push origin main

Write-Host "--- Deployment triggered! ---" -ForegroundColor Green
