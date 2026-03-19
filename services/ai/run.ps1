$ErrorActionPreference = "Stop"
Push-Location $PSScriptRoot
try {

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example. Start MongoDB locally before launching the Docker stack." -ForegroundColor Yellow
}

docker compose up --build
}
finally {
    Pop-Location
}
