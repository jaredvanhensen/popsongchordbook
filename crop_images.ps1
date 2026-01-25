Add-Type -AssemblyName System.Drawing

function Crop-ImageBottom {
    param (
        [string]$ImagePath
    )

    $bitmap = [System.Drawing.Bitmap]::FromFile($ImagePath)
    
    # Find the last row that is not white
    $lastRow = $bitmap.Height - 1
    $found = $false
    
    for ($y = $bitmap.Height - 1; $y -ge 0; $y--) {
        for ($x = 0; $x -lt $bitmap.Width; $x++) {
            $pixel = $bitmap.GetPixel($x, $y)
            # Check if not white (allowing some tolerance for compression artifacts)
            if ($pixel.R -lt 250 -or $pixel.G -lt 250 -or $pixel.B -lt 250) {
                $lastRow = $y
                $found = $true
                break
            }
        }
        if ($found) { break }
    }

    # Add a small padding
    $padding = 10
    $cropHeight = [Math]::Min($bitmap.Height, $lastRow + $padding)

    $rect = New-Object System.Drawing.Rectangle(0, 0, $bitmap.Width, $cropHeight)
    $croppedHelper = $bitmap.Clone($rect, $bitmap.PixelFormat)
    
    $bitmap.Dispose()
    
    $croppedHelper.Save($ImagePath + ".cropped.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $croppedHelper.Dispose()
    
    return $ImagePath + ".cropped.png"
}

$images = @("images\transpose.png", "images\transpose_result.png")

foreach ($img in $images) {
    if (Test-Path $img) {
        Write-Host "Cropping $img..."
        $cropped = Crop-ImageBottom -ImagePath (Resolve-Path $img)
        
        # Replace original
        Move-Item -Path $cropped -Destination $img -Force
        Write-Host "Done."
    }
    else {
        Write-Error "Image $img not found."
    }
}
