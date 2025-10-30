#!/bin/bash
# ==============================================================================
# Docker Build Script for Food Orders CRM
# ==============================================================================

set -e

echo "🐳 Building Food Orders CRM Docker Image..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✓${NC} Environment variables loaded"
else
    echo -e "${YELLOW}⚠${NC} No .env file found. Using defaults."
fi

# Build arguments
BUILD_ARGS="--build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}"
BUILD_ARGS="${BUILD_ARGS} --build-arg DATABASE_URL=${DATABASE_URL}"
BUILD_ARGS="${BUILD_ARGS} --build-arg DIRECT_URL=${DIRECT_URL}"

# Build the image
echo "Building Docker image..."
docker build ${BUILD_ARGS} -t food-orders-crm:latest -t food-orders-crm:$(date +%Y%m%d-%H%M%S) .

echo -e "${GREEN}✓${NC} Docker image built successfully!"
echo ""
echo "To run the container:"
echo "  docker-compose up -d"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f app"
