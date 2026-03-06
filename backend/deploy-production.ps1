# Production Cloud Run Deployment Script
# Secrets are read from local .env file (never committed to git)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Production Cloud Run Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$SERVICE_NAME = "scopic-legal-api"
$REGION = "us-central1"
$PROJECT_ID = "founders-478911"
$ACCOUNT = "ezazahamadspam@gmail.com"

# Check gcloud
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: gcloud CLI is not installed" -ForegroundColor Red; exit 1
}
Write-Host "OK: gcloud CLI found" -ForegroundColor Green

# Set correct account + project
gcloud config set account $ACCOUNT 2>&1 | Out-Null
gcloud config set project $PROJECT_ID 2>&1 | Out-Null

$authCheck = (gcloud auth print-access-token 2>&1 | Out-String).Trim()
if ($authCheck -like "*ERROR*") {
    Write-Host "ERROR: Not authenticated. Run: gcloud auth login $ACCOUNT" -ForegroundColor Red; exit 1
}
Write-Host "OK: Authenticated as $ACCOUNT" -ForegroundColor Green

# Read secrets from .env file
$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env file not found at $envFile" -ForegroundColor Red; exit 1
}

$envVars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.+)$') {
        $envVars[$matches[1].Trim()] = $matches[2].Trim()
    }
}

$secrets = @(
    "OPENAI_API_KEY=$($envVars['OPENAI_API_KEY'])",
    "CLAUDE_API_KEY=$($envVars['CLAUDE_API_KEY'])",
    "SUPABASE_DB_URL=$($envVars['SUPABASE_DB_URL'])",
    "SUPABASE_JWT_SECRET=$($envVars['SUPABASE_JWT_SECRET'])",
    "SUPABASE_ANON_KEY=$($envVars['SUPABASE_ANON_KEY'])",
    "SUPABASE_SERVICE_ROLE_KEY=$($envVars['SUPABASE_SERVICE_ROLE_KEY'])"
) -join ","

Write-Host "OK: Secrets loaded from .env" -ForegroundColor Green
Write-Host ""
Write-Host "Service : $SERVICE_NAME"
Write-Host "Project : $PROJECT_ID"
Write-Host "Region  : $REGION"
Write-Host ""
$confirm = Read-Host "Deploy? (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") { Write-Host "Cancelled" -ForegroundColor Yellow; exit 0 }

Write-Host ""
Write-Host "Building and deploying..." -ForegroundColor Cyan

gcloud run deploy $SERVICE_NAME `
    --source . `
    --region $REGION `
    --project $PROJECT_ID `
    --platform managed `
    --allow-unauthenticated `
    --min-instances 0 `
    --max-instances 5 `
    --cpu 1 `
    --memory 1Gi `
    --timeout 300 `
    --env-vars-file env.yaml `
    --set-env-vars $secrets

if ($LASTEXITCODE -eq 0) {
    $serviceUrl = (gcloud run services describe $SERVICE_NAME --region $REGION --project $PROJECT_ID --format="value(status.url)" 2>&1).Trim()
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCCESS! Backend live at:" -ForegroundColor Green
    Write-Host $serviceUrl -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next: update frontend/.env.production with:" -ForegroundColor Yellow
    Write-Host "NEXT_PUBLIC_API_BASE_URL=$serviceUrl" -ForegroundColor White
} else {
    Write-Host "ERROR: Deployment failed. Check logs above." -ForegroundColor Red
    exit 1
}
