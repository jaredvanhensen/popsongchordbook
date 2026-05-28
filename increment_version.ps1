$files = @("index.html", "songlist.html", "songlist-old.html", "js/app.js", "scrolling_chords.html", "ChordTrainer.html", "GuitarChordTrainer.html", "ChordTheory&Tips.html", "ChordTheory&TipsGuitar.html", "song.html", "artist.html")
$versionPattern = '<span id="site-version">(\d+\.?\d*)</span>'
$currentVersion = 0.0

# 1. Find current version from index.html
$indexFile = Join-Path $PSScriptRoot "index.html"
$indexContent = Get-Content $indexFile -Raw -Encoding UTF8

if ($indexContent -match $versionPattern) {
    $currentVersion = [double]$matches[1]
}
else {
    Write-Error "Could not find version pattern in index.html"
    exit 1
}

# 2. Calculate new version
$newVersionNum = $currentVersion + 0.001
$newVersionStr = "{0:N3}" -f $newVersionNum
$newVersionStr = $newVersionStr.Replace(',', '.') # Ensure dot separator

Write-Host "Updating version from $currentVersion to $newVersionStr..."

# 3. Update all files
foreach ($fileName in $files) {
    $filePath = Join-Path $PSScriptRoot $fileName
    
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw -Encoding UTF8
        
        # Update visible version span (supporting any order of attributes/classes)
        $regexWithWhitespace = '(?s)<span(\s+[^>]*id="site-version"[^>]*)>(\d+\.?\d*)</span>'
        if ($content -match $regexWithWhitespace) {
            $content = $content -replace $regexWithWhitespace, "<span`$1>$newVersionStr</span>"
            Write-Host "  - Found and updated version span in $fileName"
        }
        else {
            Write-Warning "  - Could NOT find version span in $fileName"
        }
        
        # Update script/css query strings (?v=X.XX or ?v=XX)
        $content = $content -replace '\?v=(\d+(\.\d+)?)', "?v=$newVersionStr"

        # Update version in parentheses (v1.XX)
        $content = $content -replace "\(v\d+\.?\d*\)", "(v$newVersionStr)"

        # Update meta version tags
        $content = $content -replace '<meta name="version" content="\d+\.?\d*">', "<meta name=`"version`" content=`"$newVersionStr`">"
        $content = $content -replace '<meta name="application-version" content="v\d+\.?\d*">', "<meta name=`"application-version`" content=`"v$newVersionStr`">"

        # Update title version prefixes
        $content = $content -replace '<title>PopSongChordBook v\d+\.?\d*', "<title>PopSongChordBook v$newVersionStr"
        $content = $content -replace '<title>Song List v\d+\.?\d*', "<title>Song List v$newVersionStr"

        # Update JavaScript constants
        $content = $content -replace "const SITE_VERSION = '\d+\.?\d*';", "const SITE_VERSION = '$newVersionStr';"
        
        [System.IO.File]::WriteAllText($filePath, $content)
        Write-Host "Updated $fileName"
    }
    else {
        Write-Warning "File not found: $fileName"
    }
}

# Run static pages pre-renderer and sitemap generator
Write-Host "Syncing latest songs from database..."
node scripts/sync_songs.js

Write-Host "Running static pages pre-renderer..."
node scripts/generate_static_pages.js

Write-Host "Generating sitemap..."
node scripts/generate_sitemap.js

Write-Host "Version update complete! New version: $newVersionStr"
