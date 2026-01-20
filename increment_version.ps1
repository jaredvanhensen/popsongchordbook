$files = @("index.html", "songlist.html")
$versionPattern = '<span id="site-version">(\d+\.?\d*)</span>'
$foundVersion = $false
$currentVersion = 0.0

# 1. Find current version from index.html
$indexFile = Join-Path $PSScriptRoot "index.html"
$indexContent = Get-Content $indexFile -Raw -Encoding UTF8

if ($indexContent -match $versionPattern) {
    $currentVersion = [double]$matches[1]
    $foundVersion = $true
}
else {
    Write-Error "Could not find version pattern in index.html"
    exit 1
}

# 2. Calculate new version
$newVersionNum = $currentVersion + 0.01
$newVersionStr = "{0:N2}" -f $newVersionNum
$newVersionStr = $newVersionStr.Replace(',', '.') # Ensure dot separator

Write-Host "Updating version from $currentVersion to $newVersionStr..."

# 3. Update all files
foreach ($fileName in $files) {
    $filePath = Join-Path $PSScriptRoot $fileName
    
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw -Encoding UTF8
        
        # Update visible version span
        # Note: We use the same pattern as reading, but globally if needed, though usually one per page
        if ($content -match $versionPattern) {
            $content = $content -replace $versionPattern, "<span id=`"site-version`">$newVersionStr</span>"
        }
        
        # Update connection status version (songlist.html specifically has this inline)
        # But the span replacement above should cover it if they use the same ID.
        
        # Update script/css query strings (?v=X.XX or ?v=XX)
        # Regex to match ?v=NUMBER
        $content = $content -replace '\?v=(\d+(\.\d+)?)', "?v=$newVersionStr"
        
        [System.IO.File]::WriteAllText($filePath, $content)
        Write-Host "Updated $fileName"
    }
    else {
        Write-Warning "File not found: $fileName"
    }
}

Write-Host "Version update complete! New version: $newVersionStr"
