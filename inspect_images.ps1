Add-Type -AssemblyName System.Drawing

function Inspect-ImageBottom {
    param (
        [string]$ImagePath
    )

    if (-not (Test-Path $ImagePath)) {
        Write-Error "File not found: $ImagePath"
        return
    }

    $bitmap = [System.Drawing.Bitmap]::FromFile((Resolve-Path $ImagePath))
    
    Write-Host "Inspecting $ImagePath (Size: $($bitmap.Width)x$($bitmap.Height))"
    
    # Check bottom row, middle pixel
    $y = $bitmap.Height - 1
    $x = [int]($bitmap.Width / 2)
    $pixel = $bitmap.GetPixel($x, $y)
    Write-Host "Bottom-Middle Pixel ($x, $y): R=$($pixel.R) G=$($pixel.G) B=$($pixel.B)"

    # Check 100 pixels up
    $y = $bitmap.Height - 100
    if ($y -ge 0) {
        $pixel = $bitmap.GetPixel($x, $y)
        Write-Host "Bottom-100 Pixel ($x, $y): R=$($pixel.R) G=$($pixel.G) B=$($pixel.B)"
    }

    $bitmap.Dispose()
}

Inspect-ImageBottom "images\transpose.png"
Inspect-ImageBottom "images\transpose_result.png"
