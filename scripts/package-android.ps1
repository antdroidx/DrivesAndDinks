$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$project = Join-Path $root 'packaging/android/DrivesAndDinks.Android.csproj'
$output = Join-Path $root 'packaging/android/artifacts'
$sdk = Join-Path $env:LOCALAPPDATA 'Android/Sdk'
dotnet publish $project -c Release -f net10.0-android -p:AndroidSdkDirectory=$sdk -p:AndroidPackageFormat=apk -o $output
Write-Host "Android package: $output"