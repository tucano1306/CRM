# ==============================================================================
# PowerShell Docker Build Script for Food Orders CRM
# ==============================================================================

Write-Host "🐳 Building Food Orders CRM Docker Image..." -ForegroundColor Cyan

# Check if .env file exists
if (Test-Path .env) {
    Write-Host "✓ Loading environment variables from .env" -ForegroundColor Green
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
} else {
    Write-Host "⚠ No .env file found. Using defaults." -ForegroundColor Yellow
}

# Get environment variables
$CLERK_KEY = $env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
$DB_URL = $env:DATABASE_URL
$DIRECT_URL = $env:DIRECT_URL

# Build arguments
$buildArgs = @(
    "--build-arg", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$CLERK_KEY",
    "--build-arg", "DATABASE_URL=$DB_URL",
    "--build-arg", "DIRECT_URL=$DIRECT_URL"
)

# Generate timestamp tag
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

# Build the Docker image
Write-Host "`n🔨 Building Docker image..." -ForegroundColor Yellow
docker build $buildArgs -t food-orders-crm:latest -t food-orders-crm:$timestamp .

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Docker image built successfully!" -ForegroundColor Green
    Write-Host "`nAvailable commands:" -ForegroundColor Cyan
    Write-Host "  Start:      docker-compose up -d"
    Write-Host "  Stop:       docker-compose down"
    Write-Host "  Logs:       docker-compose logs -f app"
    Write-Host "  Rebuild:    docker-compose up -d --build"
} else {
    Write-Host "`n✗ Build failed!" -ForegroundColor Red
    exit 1
}
