# Cloud Run Deployment Script for Backend
# This script builds and deploys the FastAPI backend to Google Cloud Run

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cloud Run Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if gcloud is installed
Write-Host "Checking for gcloud CLI..." -ForegroundColor Yellow
$gcloudCheck = Get-Command gcloud -ErrorAction SilentlyContinue
if ($null -eq $gcloudCheck) {
    Write-Host "ERROR: gcloud CLI is not installed" -ForegroundColor Red
    Write-Host "Please install it from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}
Write-Host "OK: gcloud CLI is installed" -ForegroundColor Green
Write-Host ""

# Check if user is authenticated
Write-Host "Checking authentication..." -ForegroundColor Yellow
$authCheck = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>&1 | Out-String
$authCheck = $authCheck.Trim()
if ([string]::IsNullOrWhiteSpace($authCheck)) {
    Write-Host "ERROR: Not authenticated with gcloud" -ForegroundColor Red
    Write-Host "Please run: gcloud auth login" -ForegroundColor Yellow
    exit 1
}
Write-Host "OK: Authenticated as: $authCheck" -ForegroundColor Green
Write-Host ""

# Get current project
Write-Host "Checking GCP project..." -ForegroundColor Yellow
$currentProject = gcloud config get-value project 2>&1 | Out-String
$currentProject = $currentProject.Trim()
if ([string]::IsNullOrWhiteSpace($currentProject) -or $currentProject -eq "(unset)") {
    Write-Host "ERROR: No GCP project set" -ForegroundColor Red
    Write-Host "Please set a project with: gcloud config set project PROJECT_ID" -ForegroundColor Yellow
    exit 1
}
Write-Host "OK: Current project: $currentProject" -ForegroundColor Green
Write-Host ""

# Configuration
$SERVICE_NAME = "founders-backend"
$REGION = "us-central1"
$MEMORY = "1Gi"
$CPU = "1"
$MIN_INSTANCES = "0"
$MAX_INSTANCES = "10"

# Confirm deployment
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Ready to deploy to Cloud Run" -ForegroundColor Cyan
Write-Host "Service Name: $SERVICE_NAME" -ForegroundColor White
Write-Host "Project: $currentProject" -ForegroundColor White
Write-Host "Region: $REGION" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
$confirm = Read-Host "Do you want to proceed with deployment? (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Deployment cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Deployment..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Deploy to Cloud Run
Write-Host "Building and deploying to Cloud Run..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Yellow
Write-Host ""

gcloud run deploy $SERVICE_NAME `
    --source . `
    --region $REGION `
    --allow-unauthenticated `
    --env-vars-file .env.yaml `
    --memory $MEMORY `
    --cpu $CPU `
    --min-instances $MIN_INSTANCES `
    --max-instances $MAX_INSTANCES `
    --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCCESS: Deployment Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    # Get the service URL
    $serviceUrl = gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)" 2>&1
    
    Write-Host "Your application is now live!" -ForegroundColor Cyan
    Write-Host "URL: $serviceUrl" -ForegroundColor White
    Write-Host "API Docs: $serviceUrl/docs" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Useful commands:" -ForegroundColor Yellow
    Write-Host "  View logs:    gcloud run logs read --service=$SERVICE_NAME --region=$REGION" -ForegroundColor White
    Write-Host "  Stream logs:  gcloud run logs tail --service=$SERVICE_NAME --region=$REGION" -ForegroundColor White
    Write-Host "  View service: gcloud run services describe $SERVICE_NAME --region=$REGION" -ForegroundColor White
    Write-Host "  List revisions: gcloud run revisions list --service=$SERVICE_NAME --region=$REGION" -ForegroundColor White
    Write-Host ""
    
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "ERROR: Deployment Failed" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the error messages above" -ForegroundColor Yellow
    exit 1
}
