$file = Join-Path $PSScriptRoot "index.html"
$content = Get-Content $file -Raw -Encoding UTF8

if ($content -match 'Version <span id="site-version">(\d+\.?\d*)</span>') {
    $currentVersion = [double]$matches[1]
    $newVersion = "{0:N2}" -f ($currentVersion + 0.01)
    # Ensure dot separator for consistnecy if locale differs, though input HTML has dot.
    $newVersion = $newVersion.Replace(',', '.') 
    
    $newContent = $content -replace 'Version <span id="site-version">(\d+\.?\d*)</span>', "Version <span id=`"site-version`">$newVersion</span>"
    
    # Use ascii or utf8 no bom to minimize diffs
    [System.IO.File]::WriteAllText($file, $newContent)
    Write-Host "Updated version from $currentVersion to $newVersion"
} else {
    Write-Error "Could not find version pattern in index.html"
}
