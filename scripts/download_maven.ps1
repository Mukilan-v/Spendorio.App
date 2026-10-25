$ErrorActionPreference = 'Stop'
$url = 'https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip'
$out = 'c:\Users\acer\Documents\Task Cost\maven.zip'
$target = 'c:\Users\acer\Documents\Task Cost\maven'

Write-Host "Downloading Maven from $url..."
Invoke-WebRequest -Uri $url -OutFile $out
Write-Host "Extracting to $target..."
Expand-Archive -Path $out -DestinationPath $target -Force
Remove-Item $out -Force
Write-Host "Maven downloaded and extracted successfully!"
