# CMES-USER Authentication System Setup Script (Windows)
# This script installs all dependencies needed for the auth system

Write-Host "🚀 CMES-USER Authentication System Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Install backend dependencies
Write-Host "📦 Installing Backend Dependencies..." -ForegroundColor Yellow

$backendPath = "$PSScriptRoot\backend"

if (-not (Test-Path "$backendPath\package.json")) {
    Write-Host "❌ package.json not found in backend!" -ForegroundColor Red
    exit 1
}

Push-Location $backendPath

npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "✅ Backend dependencies installed successfully" -ForegroundColor Green

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ .env file created (please edit and add JWT_SECRET)" -ForegroundColor Green
    }
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

Pop-Location

# Check if frontend directory exists and install
$frontendPath = "$PSScriptRoot\frontend"

if (Test-Path $frontendPath) {
    Write-Host "📦 Installing Frontend Dependencies..." -ForegroundColor Yellow
    
    if (Test-Path "$frontendPath\package.json") {
        Push-Location $frontendPath
        
        npm install
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
            Pop-Location
            exit 1
        }
        
        Write-Host "✅ Frontend dependencies installed successfully" -ForegroundColor Green
        Pop-Location
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Edit backend\.env and set JWT_SECRET"
Write-Host "2. Start backend: cd backend && npm start"
Write-Host "3. Start frontend: cd frontend && npm start"
Write-Host "4. Visit http://localhost:3000"
Write-Host ""
Write-Host "To test the system:" -ForegroundColor Yellow
Write-Host "cd backend && node test-auth.js"
Write-Host ""

# Ask if user wants to start the servers
Write-Host "Would you like to start the servers now?" -ForegroundColor Cyan
Write-Host "1. Yes, start both servers"
Write-Host "2. No, I'll start them manually"
Write-Host ""

$choice = Read-Host "Enter your choice (1 or 2)"

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "Starting backend server..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd" -ArgumentList "/c cd backend && npm start"
    
    Start-Sleep -Seconds 3
    
    Write-Host "Starting frontend server..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd" -ArgumentList "/c cd frontend && npm start"
    
    Write-Host ""
    Write-Host "✅ Servers starting..." -ForegroundColor Green
    Write-Host "Backend: http://localhost:4000" -ForegroundColor Cyan
    Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
}
