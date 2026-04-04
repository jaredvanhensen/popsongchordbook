# Commit and Sync Script for Pop Song Chord Book
# Usage: .\comit.ps1 "Your commit message"
# This script ensures index.html and songlist.html (and others) are synced correctly with the new version.

param (
    [Parameter(Mandatory=$true)]
    [string]$Message
)

$root = $PSScriptRoot
$indexFile = Join-Path $root "index.html"
$songlistFile = Join-Path $root "songlist.html"
$changelogFile = Join-Path $root "changelog.html"
$appJsFile = Join-Path $root "js/app.js"
$scrollingHtmlFile = Join-Path $root "scrolling_chords.html"
$scrollingJsFile = Join-Path $root "js/scrolling_chords.js"

# 1. Read current version from index.html (Source of Truth)
Write-Host "--- DETECTING CURRENT VERSION ---" -ForegroundColor Cyan
$indexContent = Get-Content $indexFile -Raw -Encoding UTF8
if ($indexContent -match 'v<span id="site-version">([\d\.]+)</span>') {
    $currentVersion = $matches[1]
    Write-Host "Current Version: $currentVersion"
} else {
    Write-Error "Could not determine current version from index.html"
    exit 1
}

# 2. Increment Version (v2.542 -> v2.543)
$versionParts = $currentVersion.Split('.')
if ($versionParts.Length -ge 2) {
    $lastPart = [int]$versionParts[$versionParts.Length - 1]
    $newLastPart = $lastPart + 1
    $baseParts = $versionParts[0..($versionParts.Length - 2)]
    $newVersion = ($baseParts -join '.') + "." + $newLastPart
} else {
    # Fallback for simple version numbers
    $newVersion = ([int]$currentVersion + 1).ToString()
}

Write-Host "New Target Version: $newVersion" -ForegroundColor Yellow

# 3. Update index.html
Write-Host "Updating index.html..."
$indexContent = $indexContent -replace 'v<span id="site-version">[\d\.]+</span>', "v<span id=`"site-version`">$newVersion</span>"
$indexContent = $indexContent -replace '\?v=[\d\.]+', ("?v=$newVersion")
# Also update meta description if present
$indexContent = $indexContent -replace '(Songbook v)[\d\.]+', ("`$1$newVersion")
Set-Content $indexFile $indexContent -Encoding UTF8

# 4. Update songlist.html
Write-Host "Updating songlist.html..."
$songlistContent = Get-Content $songlistFile -Raw -Encoding UTF8
$songlistContent = $songlistContent -replace 'v<span id="site-version">[\d\.]+</span>', "v<span id=`"site-version`">$newVersion</span>"
$songlistContent = $songlistContent -replace '\?v=[\d\.]+', ("?v=$newVersion")
Set-Content $songlistFile $songlistContent -Encoding UTF8

# 5. Update scrolling_chords.html & js
if (Test-Path $scrollingHtmlFile) {
    Write-Host "Updating scrolling_chords.html..."
    $scrollingHtmlContent = Get-Content $scrollingHtmlFile -Raw -Encoding UTF8
    $scrollingHtmlContent = $scrollingHtmlContent -replace '\?v=[\d\.]+', ("?v=$newVersion")
    Set-Content $scrollingHtmlFile $scrollingHtmlContent -Encoding UTF8
}

if (Test-Path $scrollingJsFile) {
    Write-Host "Updating scrolling_chords.js..."
    $scrollingJsContent = Get-Content $scrollingJsFile -Raw -Encoding UTF8
    $scrollingJsContent = $scrollingJsContent -replace '(Scrolling Chords Logic \(v)[\d\.]+', ("`$1$newVersion")
    Set-Content $scrollingJsFile $scrollingJsContent -Encoding UTF8
}

# 6. Update app.js logging
if (Test-Path $appJsFile) {
    Write-Host "Updating app.js..."
    $appJsContent = Get-Content $appJsFile -Raw -Encoding UTF8
    $appJsContent = $appJsContent -replace '(App Initialized \(v)[\d\.]+', ("`$1$newVersion")
    Set-Content $appJsFile $appJsContent -Encoding UTF8
}

# 7. Git Operations
Write-Host "--- GIT STAGING & COMMIT ---" -ForegroundColor Cyan
git add .
git commit -m "$Message (v$newVersion)"

Write-Host "--- GIT PUSH ---" -ForegroundColor Cyan
git push

Write-Host "`nSUCCESS: Version $newVersion is now synced and pushed!" -ForegroundColor Green
Write-Host "Don't forget to manually update changelog.html if needed." -ForegroundColor Gray
