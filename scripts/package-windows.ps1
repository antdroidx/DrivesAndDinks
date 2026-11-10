$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$project = Join-Path $root 'packaging/windows/DrivesAndDinks.Windows.csproj'
$output = Join-Path $root 'packaging/windows/artifacts'
dotnet publish $project -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o $output
Write-Host "Windows package: $output"