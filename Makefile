# ==============================================================================
# Makefile for Food Orders CRM - Docker Management
# ==============================================================================

.PHONY: help build dev prod up down logs shell db-migrate db-seed clean

# Colors
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo "$(CYAN)Food Orders CRM - Docker Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

# ==============================================================================
# Development
# ==============================================================================

dev: ## Start development environment (DB + Redis only)
	@echo "$(CYAN)Starting development environment...$(NC)"
	docker-compose -f docker-compose.dev.yml up -d
	@echo "$(GREEN)✓ Development environment started!$(NC)"
	@echo "Run: npm run dev"

dev-down: ## Stop development environment
	@echo "$(YELLOW)Stopping development environment...$(NC)"
	docker-compose -f docker-compose.dev.yml down

dev-logs: ## View development environment logs
	docker-compose -f docker-compose.dev.yml logs -f

# ==============================================================================
# Production
# ==============================================================================

build: ## Build Docker image
	@echo "$(CYAN)Building Docker image...$(NC)"
	@if [ -f ./docker-build.sh ]; then \
		chmod +x ./docker-build.sh && ./docker-build.sh; \
	else \
		docker build -t food-orders-crm:latest .; \
	fi

prod: ## Start production environment
	@echo "$(CYAN)Starting production environment...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ Production environment started!$(NC)"
	@echo "App running at: http://localhost:3000"

prod-build: ## Build and start production environment
	@echo "$(CYAN)Building and starting production environment...$(NC)"
	docker-compose up -d --build
	@echo "$(GREEN)✓ Production environment started!$(NC)"

prod-nginx: ## Start production with Nginx
	@echo "$(CYAN)Starting production with Nginx...$(NC)"
	docker-compose --profile production up -d
	@echo "$(GREEN)✓ Production with Nginx started!$(NC)"

# ==============================================================================
# General Commands
# ==============================================================================

up: ## Start all services
	docker-compose up -d

down: ## Stop all services
	@echo "$(YELLOW)Stopping all services...$(NC)"
	docker-compose down

restart: ## Restart all services
	@echo "$(YELLOW)Restarting all services...$(NC)"
	docker-compose restart

logs: ## View logs from all services
	docker-compose logs -f

logs-app: ## View app logs
	docker-compose logs -f app

logs-db: ## View database logs
	docker-compose logs -f db

logs-redis: ## View Redis logs
	docker-compose logs -f redis

# ==============================================================================
# Container Access
# ==============================================================================

shell: ## Access app container shell
	docker-compose exec app sh

shell-db: ## Access database shell
	docker-compose exec db psql -U crmuser food_orders_crm

# ==============================================================================
# Database Operations
# ==============================================================================

db-migrate: ## Run database migrations
	@echo "$(CYAN)Running database migrations...$(NC)"
	docker-compose exec app npx prisma migrate deploy
	@echo "$(GREEN)✓ Migrations completed!$(NC)"

db-seed: ## Seed the database
	@echo "$(CYAN)Seeding database...$(NC)"
	docker-compose exec app npx prisma db seed
	@echo "$(GREEN)✓ Database seeded!$(NC)"

db-studio: ## Open Prisma Studio
	@echo "$(CYAN)Opening Prisma Studio...$(NC)"
	docker-compose exec app npx prisma studio

db-reset: ## Reset database (⚠️ deletes all data)
	@echo "$(YELLOW)⚠️  This will delete all data. Are you sure? [y/N]$(NC)" && read ans && [ $${ans:-N} = y ]
	docker-compose exec app npx prisma migrate reset --force
	@echo "$(GREEN)✓ Database reset!$(NC)"

db-backup: ## Backup database
	@echo "$(CYAN)Backing up database...$(NC)"
	@mkdir -p backups
	docker-compose exec db pg_dump -U crmuser food_orders_crm > backups/backup-$$(date +%Y%m%d-%H%M%S).sql
	@echo "$(GREEN)✓ Backup created in backups/$(NC)"

db-restore: ## Restore database from latest backup
	@echo "$(CYAN)Restoring database...$(NC)"
	@LATEST=$$(ls -t backups/*.sql 2>/dev/null | head -1); \
	if [ -z "$$LATEST" ]; then \
		echo "$(YELLOW)No backup files found!$(NC)"; \
		exit 1; \
	fi; \
	echo "Restoring from: $$LATEST"; \
	docker-compose exec -T db psql -U crmuser food_orders_crm < $$LATEST
	@echo "$(GREEN)✓ Database restored!$(NC)"

# ==============================================================================
# Monitoring & Debugging
# ==============================================================================

status: ## Show status of all containers
	docker-compose ps

stats: ## Show container resource usage
	docker stats --no-stream

health: ## Check health of services
	@echo "$(CYAN)Checking service health...$(NC)"
	@curl -s http://localhost:3000/api/health | jq . || echo "$(YELLOW)App not responding$(NC)"

inspect: ## Inspect Docker configuration
	docker-compose config

# ==============================================================================
# Cleanup
# ==============================================================================

clean: ## Remove containers and networks
	@echo "$(YELLOW)Removing containers and networks...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Cleanup completed!$(NC)"

clean-all: ## Remove containers, networks, and volumes (⚠️ deletes data)
	@echo "$(YELLOW)⚠️  This will delete all data. Are you sure? [y/N]$(NC)" && read ans && [ $${ans:-N} = y ]
	docker-compose down -v
	@echo "$(GREEN)✓ Full cleanup completed!$(NC)"

clean-images: ## Remove Docker images
	@echo "$(YELLOW)Removing Docker images...$(NC)"
	docker rmi food-orders-crm:latest || true
	@echo "$(GREEN)✓ Images removed!$(NC)"

prune: ## Remove all unused Docker resources
	@echo "$(YELLOW)Pruning Docker system...$(NC)"
	docker system prune -af --volumes
	@echo "$(GREEN)✓ Prune completed!$(NC)"

# ==============================================================================
# Testing
# ==============================================================================

test: ## Run tests in container
	docker-compose exec app npm test

test-e2e: ## Run e2e tests
	docker-compose exec app npm run test:e2e

# ==============================================================================
# CI/CD
# ==============================================================================

ci-build: ## Build for CI/CD
	docker build --no-cache -t food-orders-crm:ci .

ci-test: ## Run tests in CI/CD
	docker-compose -f docker-compose.yml run --rm app npm test
