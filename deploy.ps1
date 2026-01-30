# Deploy Script for Pop Song Chord Book
# Usage: .\deploy.ps1 "Commit message"

param (
    [string]$Message = "Update application"
)

$root = $PSScriptRoot
$indexFile = Join-Path $root "index.html"
$songlistFile = Join-Path $root "songlist.html"
$appJsFile = Join-Path $root "js\app.js"
$stylesFile = Join-Path $root "styles.css"

# 1. Read current version from index.html
$indexContent = Get-Content $indexFile -Raw -Encoding UTF8
if ($indexContent -match 'v<span id="site-version">([\d\.]+)</span>') {
    $currentVersion = $matches[1]
    Write-Host "Current Version: $currentVersion"
}
else {
    Write-Error "Could not determine current version from index.html"
    exit 1
}

# 2. Increment Version
$versionParts = $currentVersion.Split('.')
$lastPart = [int]$versionParts[$versionParts.Length - 1]
$newLastPart = $lastPart + 1
$baseVersion = $versionParts[0..($versionParts.Length - 2)] -join '.'
$newVersion = "$baseVersion.$newLastPart"
Write-Host "New Version: $newVersion"

# 3. Update index.html
# Update visual version
$indexContent = $indexContent -replace 'v<span id="site-version">[\d\.]+</span>', "v<span id=`"site-version`">$newVersion</span>"
# Update script versions
$indexContent = $indexContent -replace '\?v=[\d\.]+"', "?v=$newVersion`""
Set-Content $indexFile $indexContent -Encoding UTF8
Write-Host "Updated index.html"

# 4. Update songlist.html
$songlistContent = Get-Content $songlistFile -Raw -Encoding UTF8
# Update visual version
$songlistContent = $songlistContent -replace 'v<span id="site-version">[\d\.]+</span>', "v<span id=`"site-version`">$newVersion</span>"
# Update script versions
$songlistContent = $songlistContent -replace '\?v=[\d\.]+"', "?v=$newVersion`""
Set-Content $songlistFile $songlistContent -Encoding UTF8
Write-Host "Updated songlist.html"

# 5. Update app.js logging
$appJsContent = Get-Content $appJsFile -Raw -Encoding UTF8
$appJsContent = $appJsContent -replace 'App Initialized \(v[\d\.]+\)', "App Initialized (v$newVersion)"
Set-Content $appJsFile $appJsContent -Encoding UTF8
Write-Host "Updated js/app.js"

# 6. Git Operations
Write-Host "Staging changes..."
git add index.html songlist.html js/app.js styles.css

Write-Host "Committing..."
git commit -m "$Message (v$newVersion)"

Write-Host "Pushing..."
git push

Write-Host "Deployment Complete! New version $newVersion is live."
Write-Host "Please allow 2-5 minutes for GitHub Pages to update."
