Add-Type -AssemblyName System.Drawing
$imgPath = "C:\Users\Gebruiker\.gemini\antigravity\brain\01a8fa7e-50f1-44d6-881d-accd1a8013cc\media__1780240819004.png"
if (Test-Path $imgPath) {
    $bmp = New-Object System.Drawing.Bitmap($imgPath)
    Write-Host "Image dimensions: $($bmp.Width)x$($bmp.Height)"
    
    # Let's sample a few points in the background to find the hex colors
    # The header is purple/blue
    $samples = @(
        [PSCustomObject]@{X=10; Y=10},
        [PSCustomObject]@{X=[int]($bmp.Width / 2); Y=10},
        [PSCustomObject]@{X=[int]($bmp.Width - 10); Y=10},
        [PSCustomObject]@{X=[int]($bmp.Width / 2); Y=[int]($bmp.Height / 2)}
    )
    
    foreach ($s in $samples) {
        $color = $bmp.GetPixel($s.X, $s.Y)
        $hex = "#{0:X2}{1:X2}{2:X2}" -f $color.R, $color.G, $color.B
        Write-Host "Coordinate ($($s.X), $($s.Y)) Color: R=$($color.R), G=$($color.G), B=$($color.B) Hex=$hex"
    }
    
    $bmp.Dispose()
} else {
    Write-Host "Image not found at $imgPath"
}
