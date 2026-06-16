Add-Type -AssemblyName System.Drawing

function Inspect-Colors {
    param (
        [string]$ImagePath
    )
    $path = Resolve-Path $ImagePath
    $bitmap = [System.Drawing.Bitmap]::FromFile($path)
    Write-Host "Image: $ImagePath ($($bitmap.Width)x$($bitmap.Height))"
    
    # Corner color
    $c = $bitmap.GetPixel(10, 10)
    Write-Host "  Corner (10, 10): R=$($c.R), G=$($c.G), B=$($c.B)"
    
    # Inner squircle color (around 200, 200)
    $inner = $bitmap.GetPixel(200, 200)
    Write-Host "  Inner squircle (200, 200): R=$($inner.R), G=$($inner.G), B=$($inner.B)"
    
    # Center color
    $cx = [int]($bitmap.Width / 2)
    $cy = [int]($bitmap.Height / 2)
    $cc = $bitmap.GetPixel($cx, $cy)
    Write-Host "  Center ($cx, $cy): R=$($cc.R), G=$($cc.G), B=$($cc.B)"
    
    $bitmap.Dispose()
}

Inspect-Colors "images\pwa_logo_hero.jpg"
Inspect-Colors "images\LogoSmall1050x1050.jpg"
