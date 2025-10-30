# ==============================================================================
# Quick Start Script - Food Orders CRM Docker
# ==============================================================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev', 'prod', 'stop', 'logs', 'clean')]
    [string]$Action = 'dev'
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Color {
    param([string]$Text, [string]$Color = "White")
    Write-Host $Text -ForegroundColor $Color
}

Write-Color "`n🐳 Food Orders CRM - Docker Manager`n" "Cyan"

switch ($Action) {
    'dev' {
        Write-Color "Starting Development Environment..." "Yellow"
        Write-Color "This will start PostgreSQL and Redis only.`n" "Gray"
        
        if (-not (Test-Path .env)) {
            Write-Color "⚠ No .env file found. Creating from template..." "Yellow"
            Copy-Item .env.docker.example .env
            Write-Color "✓ Created .env file. Please edit it with your credentials." "Green"
            Write-Color "`nOpening .env in notepad..." "Gray"
            Start-Process notepad .env
            Write-Color "`nPress Enter when you've configured .env..." "Yellow"
            Read-Host
        }
        
        docker-compose -f docker-compose.dev.yml up -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-Color "`n✓ Development environment started!" "Green"
            Write-Color "`nServices running:" "Cyan"
            Write-Color "  📊 PostgreSQL: localhost:5432" "White"
            Write-Color "  🔴 Redis: localhost:6379" "White"
            Write-Color "  🗄️  Adminer: http://localhost:8080" "White"
            Write-Color "`nNext steps:" "Yellow"
            Write-Color "  1. Run: npm install" "White"
            Write-Color "  2. Run: npm run dev" "White"
            Write-Color "  3. Open: http://localhost:3000`n" "White"
        }
    }
    
    'prod' {
        Write-Color "Starting Production Environment..." "Yellow"
        Write-Color "This will build and start all services.`n" "Gray"
        
        if (-not (Test-Path .env)) {
            Write-Color "✗ No .env file found!" "Red"
            Write-Color "Please create .env from .env.docker.example" "Yellow"
            exit 1
        }
        
        Write-Color "Building Docker image..." "Yellow"
        docker-compose build
        
        if ($LASTEXITCODE -eq 0) {
            Write-Color "Starting containers..." "Yellow"
            docker-compose up -d
            
            if ($LASTEXITCODE -eq 0) {
                Write-Color "`n✓ Production environment started!" "Green"
                Write-Color "`nRunning migrations..." "Yellow"
                Start-Sleep -Seconds 5
                docker-compose exec app npx prisma migrate deploy
                
                Write-Color "`n✓ Application ready!" "Green"
                Write-Color "`nServices:" "Cyan"
                Write-Color "  🌐 App: http://localhost:3000" "White"
                Write-Color "  📊 PostgreSQL: localhost:5432" "White"
                Write-Color "  🔴 Redis: localhost:6379" "White"
                Write-Color "`nView logs with: .\docker-start.ps1 -Action logs`n" "Gray"
            }
        }
    }
    
    'stop' {
        Write-Color "Stopping all containers..." "Yellow"
        docker-compose down
        docker-compose -f docker-compose.dev.yml down
        
        if ($LASTEXITCODE -eq 0) {
            Write-Color "✓ All containers stopped." "Green"
        }
    }
    
    'logs' {
        Write-Color "Showing logs (Ctrl+C to exit)...`n" "Yellow"
        docker-compose logs -f
    }
    
    'clean' {
        Write-Color "⚠ This will remove all containers and networks." "Yellow"
        Write-Color "Data in volumes will be preserved." "Gray"
        $confirm = Read-Host "`nContinue? (y/N)"
        
        if ($confirm -eq 'y') {
            docker-compose down
            docker-compose -f docker-compose.dev.yml down
            Write-Color "✓ Cleanup complete." "Green"
        } else {
            Write-Color "Cancelled." "Gray"
        }
    }
}

Write-Color ""
