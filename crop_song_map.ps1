Add-Type -AssemblyName System.Drawing

function Get-IsPurple {
    param($pixel)
    # Purple in Song Map: R is low (~50-120), G is low (~30-80), B is high (~150-240)
    return ($pixel.R -lt 150 -and $pixel.B -gt 130 -and $pixel.G -lt 150)
}

function Crop-SongMap-Robust {
    param (
        [string]$ImagePath
    )

    $bitmap = [System.Drawing.Bitmap]::FromFile($ImagePath)
    Write-Host "Robust processing $ImagePath ($($bitmap.Width)x$($bitmap.Height))..."
    
    $top = 0
    $bottom = $bitmap.Height - 1
    $left = 0
    $right = $bitmap.Width - 1

    # Find Top: first row with > 20% purple pixels
    for ($y = 0; $y -lt $bitmap.Height; $y++) {
        $count = 0
        for ($x = 0; $x -lt $bitmap.Width; $x++) {
            if (Get-IsPurple -pixel ($bitmap.GetPixel($x, $y))) { $count++ }
        }
        if ($count -gt ($bitmap.Width * 0.2)) {
            $top = $y
            break
        }
    }

    # Find Bottom: last row with > 20% purple
    for ($y = $bitmap.Height - 1; $y -ge 0; $y--) {
        $count = 0
        for ($x = 0; $x -lt $bitmap.Width; $x++) {
            if (Get-IsPurple -pixel ($bitmap.GetPixel($x, $y))) { $count++ }
        }
        if ($count -gt ($bitmap.Width * 0.2)) {
            $bottom = $y
            break
        }
    }

    # Find Left: first column with > 20% purple
    for ($x = 0; $x -lt $bitmap.Width; $x++) {
        $count = 0
        for ($y = $top; $y -le $bottom; $y++) {
            if (Get-IsPurple -pixel ($bitmap.GetPixel($x, $y))) { $count++ }
        }
        if ($count -gt (($bottom - $top) * 0.2)) {
            $left = $x
            break
        }
    }

    # Find Right: last column with > 20% purple
    for ($x = $bitmap.Width - 1; $x -ge 0; $x--) {
        $count = 0
        for ($y = $top; $y -le $bottom; $y++) {
            if (Get-IsPurple -pixel ($bitmap.GetPixel($x, $y))) { $count++ }
        }
        if ($count -gt (($bottom - $top) * 0.2)) {
            $right = $x
            break
        }
    }

    # Add 2px safety margin to avoid any remaining edges
    $left += 2
    $top += 2
    $right -= 2
    $bottom -= 2

    $width = $right - $left + 1
    $height = $bottom - $top + 1

    Write-Host "Robust Crop region: Left=$left, Top=$top, Width=$width, Height=$height"

    if ($width -gt 100 -and $height -gt 100) {
        $rect = New-Object System.Drawing.Rectangle($left, $top, $width, $height)
        $cropped = $bitmap.Clone($rect, $bitmap.PixelFormat)
        $bitmap.Dispose()
        $cropped.Save($ImagePath + ".tmp.png", [System.Drawing.Imaging.ImageFormat]::Png)
        $cropped.Dispose()
        Move-Item -Path ($ImagePath + ".tmp.png") -Destination $ImagePath -Force
        Write-Host "Successfully cropped $ImagePath with robust detection"
    }
    else {
        $bitmap.Dispose()
        Write-Host "Detection failed or image too uniform"
    }
}

Crop-SongMap-Robust -ImagePath (Resolve-Path "images/song_map_example.png").Path
