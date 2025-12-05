# Production Cloud Run Deployment Script with Secret Manager
# This script deploys the FastAPI backend to Google Cloud Run with proper secret management

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Production Cloud Run Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$SERVICE_NAME = "scopic-legal-api"
$REGION = "us-central1"
$PROJECT_ID = "founders-v3"

# Check if gcloud is installed
Write-Host "Checking for gcloud CLI..." -ForegroundColor Yellow
$gcloudCheck = Get-Command gcloud -ErrorAction SilentlyContinue
if ($null -eq $gcloudCheck) {
    Write-Host "ERROR: gcloud CLI is not installed" -ForegroundColor Red
    exit 1
}
Write-Host "OK: gcloud CLI is installed" -ForegroundColor Green
Write-Host ""

# Check authentication
Write-Host "Checking authentication..." -ForegroundColor Yellow
$authCheck = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>&1 | Out-String
$authCheck = $authCheck.Trim()
if ([string]::IsNullOrWhiteSpace($authCheck)) {
    Write-Host "ERROR: Not authenticated with gcloud" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Authenticated as: $authCheck" -ForegroundColor Green
Write-Host ""

# Confirm deployment
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Ready to deploy to Cloud Run" -ForegroundColor Cyan
Write-Host "Service: $SERVICE_NAME" -ForegroundColor White
Write-Host "Project: $PROJECT_ID" -ForegroundColor White
Write-Host "Region: $REGION" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
$confirm = Read-Host "Proceed with deployment? (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Deployment cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying to Cloud Run..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Deploy with secrets from Secret Manager
gcloud run deploy $SERVICE_NAME `
    --source . `
    --region $REGION `
    --platform managed `
    --allow-unauthenticated `
    --min-instances 0 `
    --max-instances 10 `
    --cpu 1 `
    --memory 1Gi `
    --timeout 300 `
    --env-vars-file env.yaml `
    --set-secrets "OPENAI_API_KEY=openai-api-key:latest,SUPABASE_DB_URL=supabase-db-url:latest,SUPABASE_JWT_SECRET=supabase-jwt-secret:latest,SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest,SUPABASE_ANON_KEY=supabase-anon-key:latest"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCCESS: Deployment Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    # Get the service URL
    $serviceUrl = gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)" 2>&1
    
    Write-Host "Your backend is now live!" -ForegroundColor Cyan
    Write-Host "URL: $serviceUrl" -ForegroundColor White
    Write-Host "API Docs: $serviceUrl/docs" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Update frontend .env.production with: NEXT_PUBLIC_API_BASE_URL=$serviceUrl" -ForegroundColor White
    Write-Host "2. Test the API: curl $serviceUrl/health" -ForegroundColor White
    Write-Host "3. View logs: gcloud run logs tail --service=$SERVICE_NAME --region=$REGION" -ForegroundColor White
    Write-Host ""
    
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "ERROR: Deployment Failed" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check the error messages above" -ForegroundColor Yellow
    Write-Host "View logs: gcloud run logs read --service=$SERVICE_NAME --region=$REGION --limit=50" -ForegroundColor White
    exit 1
}
