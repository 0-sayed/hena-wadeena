$ErrorActionPreference = "Stop"

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example. Add OPENAI_API_KEY before using LLM responses." -ForegroundColor Yellow
}

docker compose up --build
