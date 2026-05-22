# [ANTIGRAVITY INSTRUCTION]: Do NOT perform browser testing or open the browser after starting this server. 
# The USER will perform all manual testing themselves.
$http = [System.Net.HttpListener]::new() 
$http.Prefixes.Add("http://localhost:8080/") 
$http.Start()
Write-Host "Server started at http://localhost:8080/"
$root = $PSScriptRoot

while ($http.IsListening) {
    $context = $http.GetContext()
    $response = $context.Response
    $request = $context.Request
    
    $filename = $request.Url.LocalPath.TrimStart('/')
    if ($filename -eq "") { $filename = "index.html" }
    $filepath = Join-Path $root $filename

    # If the path points to a directory, resolve to index.html inside it
    if (Test-Path $filepath -PathType Container) {
        $filepath = Join-Path $filepath "index.html"
    }
    # Clean URLs mapping: check if adding .html resolves to a valid leaf file
    elseif (!(Test-Path $filepath -PathType Leaf) -and (Test-Path "$filepath.html" -PathType Leaf)) {
        $filepath = "$filepath.html"
    }

    if (Test-Path $filepath -PathType Leaf) {
        $bytes = [System.IO.File]::ReadAllBytes($filepath)
        $response.ContentLength64 = $bytes.Length
        
        $extension = [System.IO.Path]::GetExtension($filepath)
        switch ($extension) {
            ".html" { $response.ContentType = "text/html" }
            ".css" { $response.ContentType = "text/css" }
            ".js" { $response.ContentType = "application/javascript" }
            ".png" { $response.ContentType = "image/png" }
            ".jpg" { $response.ContentType = "image/jpeg" }
            Default { $response.ContentType = "application/octet-stream" }
        }
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    else {
        $response.StatusCode = 404
    }
    $response.Close()
}
