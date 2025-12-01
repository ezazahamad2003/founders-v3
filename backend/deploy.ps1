# GCP App Engine Deployment Script for Backend
# This script deploys the FastAPI backend to Google Cloud Platform App Engine

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GCP App Engine Deployment Script" -ForegroundColor Cyan
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

# Confirm deployment
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Ready to deploy to GCP App Engine" -ForegroundColor Cyan
Write-Host "Project: $currentProject" -ForegroundColor White
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

# Deploy to App Engine
Write-Host "Deploying to App Engine..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Yellow
Write-Host ""

gcloud app deploy app.yaml --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCCESS: Deployment Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Your application is now live!" -ForegroundColor Cyan
    Write-Host "URL: https://$currentProject.uc.r.appspot.com" -ForegroundColor White
    Write-Host "API Docs: https://$currentProject.uc.r.appspot.com/docs" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Useful commands:" -ForegroundColor Yellow
    Write-Host "  View logs:    gcloud app logs tail -s default" -ForegroundColor White
    Write-Host "  Open browser: gcloud app browse" -ForegroundColor White
    Write-Host "  View app:     gcloud app describe" -ForegroundColor White
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
