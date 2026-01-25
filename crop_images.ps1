Add-Type -AssemblyName System.Drawing

function Crop-ImageBottom {
    param (
        [string]$ImagePath
    )

    Write-Host "Processing $ImagePath..."
    $bitmap = [System.Drawing.Bitmap]::FromFile($ImagePath)
    
    # Stricter threshold: Content must be darker than 230
    # This filters out faint shadows and compression artifacts
    $threshold = 230
    
    $lastRow = 0 # Default to 0 if nothing found (shouldn't happen)
    $found = $false
    
    # Scan from bottom up
    for ($y = $bitmap.Height - 1; $y -ge 0; $y--) {
        for ($x = 0; $x -lt $bitmap.Width; $x++) {
            $pixel = $bitmap.GetPixel($x, $y)
            
            # Content detection
            if ($pixel.R -lt $threshold -or $pixel.G -lt $threshold -or $pixel.B -lt $threshold) {
                $lastRow = $y
                $found = $true
                break
            }
        }
        if ($found) { break }
    }

    Write-Host "Found bottom content at row: $lastRow (Total height: $($bitmap.Height))"

    # Add a small padding
    $padding = 10
    $cropHeight = [Math]::Min($bitmap.Height, $lastRow + $padding)

    if ($cropHeight -lt $bitmap.Height) {
        $rect = New-Object System.Drawing.Rectangle(0, 0, $bitmap.Width, $cropHeight)
        $croppedHelper = $bitmap.Clone($rect, $bitmap.PixelFormat)
        
        $bitmap.Dispose() # Release file lock
        
        $croppedHelper.Save($ImagePath + ".cropped.png", [System.Drawing.Imaging.ImageFormat]::Png)
        $croppedHelper.Dispose()
        
        # Replace original
        Move-Item -Path ($ImagePath + ".cropped.png") -Destination $ImagePath -Force
        Write-Host "Cropped and saved to $ImagePath"
    }
    else {
        $bitmap.Dispose()
        Write-Host "No cropping needed (content extends to bottom)."
    }
}

$images = @(
    (Resolve-Path "images\transpose.png").Path, 
    (Resolve-Path "images\transpose_result.png").Path
)

foreach ($img in $images) {
    if (Test-Path $img) {
        Crop-ImageBottom -ImagePath $img
    }
    else {
        Write-Error "Image $img not found."
    }
}
