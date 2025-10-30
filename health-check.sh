#!/bin/bash
# ==============================================================================
# Health Check Script - Food Orders CRM
# Verifica el estado de todos los servicios
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Food Orders CRM - Health Check${NC}"
echo -e "${BLUE}================================${NC}\n"

# Verificar Docker
echo -e "${YELLOW}Checking Docker...${NC}"
if docker info > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Docker is running${NC}\n"
else
    echo -e "${RED}✗ Docker is not running${NC}\n"
    exit 1
fi

# Verificar containers
echo -e "${YELLOW}Checking Containers...${NC}"
CONTAINERS=$(docker-compose ps -q 2>/dev/null | wc -l)
if [ "$CONTAINERS" -gt 0 ]; then
    echo -e "${GREEN}✓ Found $CONTAINERS running containers${NC}"
    docker-compose ps
    echo ""
else
    echo -e "${RED}✗ No containers running${NC}\n"
    exit 1
fi

# Verificar PostgreSQL
echo -e "${YELLOW}Checking PostgreSQL...${NC}"
if docker-compose exec -T db pg_isready -U crmuser > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL is ready${NC}\n"
else
    echo -e "${RED}✗ PostgreSQL is not responding${NC}\n"
    exit 1
fi

# Verificar Redis
echo -e "${YELLOW}Checking Redis...${NC}"
if docker-compose exec -T redis redis-cli --no-auth-warning -a ${REDIS_PASSWORD:-redispassword} ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is responding${NC}\n"
else
    echo -e "${RED}✗ Redis is not responding${NC}\n"
    exit 1
fi

# Verificar App (health endpoint)
echo -e "${YELLOW}Checking Application...${NC}"
HEALTH_URL="http://localhost:3000/api/health"
if RESPONSE=$(curl -s -w "\n%{http_code}" "$HEALTH_URL" 2>/dev/null); then
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Application is healthy${NC}"
        echo -e "${BLUE}Response:${NC}"
        echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
        echo ""
    else
        echo -e "${RED}✗ Application returned HTTP $HTTP_CODE${NC}\n"
        exit 1
    fi
else
    echo -e "${RED}✗ Application is not responding${NC}\n"
    exit 1
fi

# Verificar recursos
echo -e "${YELLOW}Checking Resources...${NC}"
echo -e "${BLUE}Container Stats:${NC}"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
echo ""

# Verificar disk space
echo -e "${YELLOW}Checking Disk Space...${NC}"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    echo -e "${GREEN}✓ Disk usage: ${DISK_USAGE}%${NC}\n"
else
    echo -e "${YELLOW}⚠ Disk usage high: ${DISK_USAGE}%${NC}\n"
fi

# Summary
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}✓ All health checks passed!${NC}"
echo -e "${BLUE}================================${NC}\n"

echo -e "${BLUE}Quick Commands:${NC}"
echo -e "  View logs:    docker-compose logs -f"
echo -e "  Shell access: docker-compose exec app sh"
echo -e "  Database:     docker-compose exec db psql -U crmuser food_orders_crm"
echo ""
