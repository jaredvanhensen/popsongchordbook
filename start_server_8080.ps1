$http = [System.Net.HttpListener]::new() 
$http.Prefixes.Add("http://localhost:8080/") 
$http.Start()
Write-Host "Server started at http://localhost:8080/"
$root = $PSScriptRoot

while ($http.IsListening) {
    try {
        $context = $http.GetContext()
        $response = $context.Response
        $request = $context.Request
        
        $filename = $request.Url.LocalPath.TrimStart('/')
        if ($filename -eq "") { $filename = "index.html" }
        $filepath = Join-Path $root $filename

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
                ".svg" { $response.ContentType = "image/svg+xml" }
                Default { $response.ContentType = "application/octet-stream" }
            }
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        else {
            $response.StatusCode = 404
        }
        $response.Close()
    } catch {
        Write-Host "Error: $_"
    }
}
