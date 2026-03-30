# Production Cloud Run Deployment Script
# Account: ezaz@scopiclegal.com  |  Project: scopic-v1  |  Service: scopic-legal-api

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Production Cloud Run Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$SERVICE_NAME = "scopic-legal-api"
$REGION       = "us-central1"
$PROJECT_ID   = "scopic-v1"
$ACCOUNT      = "ezaz@scopiclegal.com"

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
    if ($_ -match '^\s*([^#][^=]*[^#\s])=(.+)$') {
        $envVars[$matches[1].Trim()] = $matches[2].Trim()
    }
}

Write-Host "OK: Secrets loaded from .env" -ForegroundColor Green
Write-Host ""
Write-Host "Service : $SERVICE_NAME"
Write-Host "Project : $PROJECT_ID"
Write-Host "Region  : $REGION"
Write-Host ""

# NOTE: Production uses the direct DB URL, not the pooler URL in .env (local only).
# Extract the password from the local pooler URL and build the direct URL.
$localDbUrl = $envVars['SUPABASE_DB_URL']
if ($localDbUrl -match ':([^:@]+)@') {
    $dbPassword = $matches[1]
} else {
    Write-Host "ERROR: Could not extract DB password from SUPABASE_DB_URL in .env" -ForegroundColor Red; exit 1
}
$directDbUrl = "postgresql://postgres:${dbPassword}@db.vkwinzxslacteeqjpmne.supabase.co:5432/postgres"

# Build env vars string using semicolon delimiter to avoid comma conflicts in values
$envString = "^;^" +
    "APP_ENV=production" +
    ";SUPABASE_PROJECT_URL=$($envVars['SUPABASE_PROJECT_URL'])" +
    ";SUPABASE_JWKS_URL=$($envVars['SUPABASE_JWKS_URL'])" +
    ";SUPABASE_STORAGE_BUCKET_NAME=$($envVars['SUPABASE_STORAGE_BUCKET_NAME'])" +
    ";SUPABASE_STORAGE_PUBLIC_BASE_URL=$($envVars['SUPABASE_STORAGE_PUBLIC_BASE_URL'])" +
    ";ALLOWED_ORIGINS=https://scopiclegal.com,https://www.scopiclegal.com,https://founders-v3.vercel.app" +
    ";MAX_HISTORY_MESSAGES=30" +
    ";MAX_OUTPUT_TOKENS=4096" +
    ";OPENAI_MODEL_CHAT=gpt-5.4" +
    ";OPENAI_MODEL_VISION=gpt-5.4" +
    ";OPENAI_MODEL_DEEP_RESEARCH=gpt-5.4" +
    ";CLAUDE_MODEL=claude-sonnet-4-6" +
    ";OPENAI_API_KEY=$($envVars['OPENAI_API_KEY'])" +
    ";CLAUDE_API_KEY=$($envVars['CLAUDE_API_KEY'])" +
    ";SUPABASE_DB_URL=$directDbUrl" +
    ";SUPABASE_JWT_SECRET=$($envVars['SUPABASE_JWT_SECRET'])" +
    ";SUPABASE_ANON_KEY=$($envVars['SUPABASE_ANON_KEY'])" +
    ";SUPABASE_SERVICE_ROLE_KEY=$($envVars['SUPABASE_SERVICE_ROLE_KEY'])"

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
    "--set-env-vars=$envString" `
    --quiet

if ($LASTEXITCODE -eq 0) {
    $serviceUrl = (gcloud run services describe $SERVICE_NAME --region $REGION --project $PROJECT_ID --format="value(status.url)" 2>&1).Trim()
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCCESS! Backend live at:" -ForegroundColor Green
    Write-Host $serviceUrl -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host "ERROR: Deployment failed." -ForegroundColor Red
    exit 1
}
