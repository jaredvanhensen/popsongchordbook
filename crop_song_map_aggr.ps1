Add-Type -AssemblyName System.Drawing
$img = (Resolve-Path "images/song_map_example.png").Path
$bitmap = [System.Drawing.Bitmap]::FromFile($img)

function Get-IsPurple {
    param($pixel)
    # Target the specific purple shade of the Song Map
    # R: ~90, G: ~50, B: ~220
    return ($pixel.R -lt 150 -and $pixel.B -gt 130 -and $pixel.G -lt 130)
}

$top = 0
$bottom = $bitmap.Height - 1
$left = 0
$right = $bitmap.Width - 1

# Horizontal scan to find consistent purple columns (mass of the container)
for ($x = 0; $x -lt $bitmap.Width; $x++) {
    $count = 0
    for ($y = 0; $y -lt $bitmap.Height; $y++) {
        if (Get-IsPurple -pixel ($bitmap.GetPixel($x, $y))) { $count++ }
    }
    if ($count -gt ($bitmap.Height * 0.5)) {
        $left = $x
        break
    }
}

for ($x = $bitmap.Width - 1; $x -ge 0; $x--) {
    $count = 0
    for ($y = 0; $y -lt $bitmap.Height; $y++) {
        if (Get-IsPurple -pixel ($bitmap.GetPixel($x, $y))) { $count++ }
    }
    if ($count -gt ($bitmap.Height * 0.5)) {
        $right = $x
        break
    }
}

# Vertical scan within the detected width
for ($y = 0; $y -lt $bitmap.Height; $y++) {
    $count = 0
    for ($x = $left; $x -le $right; $x++) {
        if (Get-IsPurple -pixel ($bitmap.GetPixel($x, $y))) { $count++ }
    }
    if ($count -gt (($right - $left) * 0.5)) {
        $top = $y
        break
    }
}

for ($y = $bitmap.Height - 1; $y -ge 0; $y--) {
    $count = 0
    for ($x = $left; $x -le $right; $x++) {
        if (Get-IsPurple -pixel ($bitmap.GetPixel($x, $y))) { $count++ }
    }
    if ($count -gt (($right - $left) * 0.5)) {
        $bottom = $y
        break
    }
}

# Apply a 10px inset from the detected "solid" purple edges to be absolutely sure
$inset = 10
$left += $inset
$right -= $inset
$top += $inset
$bottom -= $inset

$width = $right - $left + 1
$height = $bottom - $top + 1

if ($width -gt 100 -and $height -gt 50) {
    $rect = New-Object System.Drawing.Rectangle($left, $top, $width, $height)
    $cropped = $bitmap.Clone($rect, $bitmap.PixelFormat)
    $bitmap.Dispose()
    $tempPath = $img + ".aggr.png"
    $cropped.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Dispose()
    Move-Item -Path $tempPath -Destination $img -Force
    Write-Host "Aggressively cropped to: $left, $top, $width, $height"
}
else {
    $bitmap.Dispose()
    Write-Host "Detection failed or image too small. Params: L=$left,R=$right,T=$top,B=$bottom"
}
