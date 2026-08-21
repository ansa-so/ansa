#!/bin/bash

# Zero-Downtime Rolling Deployment Script for Docker Compose
# This script updates services one at a time to minimize downtime

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
HEALTH_CHECK_TIMEOUT=120  # Max seconds to wait for health check (includes start_period)
HEALTH_CHECK_INTERVAL=2  # Seconds between health checks
MIGRATION_TIMEOUT=300    # Max seconds for migrations (5 minutes)

# Parse command line arguments
RUN_MIGRATIONS=false
SKIP_BUILD=false
SERVICES_TO_DEPLOY=""

print_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -m, --migrate          Run database migrations after API deployment"
    echo "  -s, --skip-build       Skip building images (use existing images)"
    echo "  -S, --service SERVICE  Only deploy specific service(s) (can be used multiple times)"
    echo "  -h, --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                     # Deploy all services"
    echo "  $0 --migrate           # Deploy all services and run migrations"
    echo "  $0 -S api -S widget    # Only deploy api and widget services"
    echo "  $0 --skip-build        # Deploy without rebuilding images"
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--migrate)
            RUN_MIGRATIONS=true
            shift
            ;;
        -s|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -S|--service)
            SERVICES_TO_DEPLOY="$SERVICES_TO_DEPLOY $2"
            shift 2
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            print_usage
            exit 1
            ;;
    esac
done

# Default to all services if none specified
if [ -z "$SERVICES_TO_DEPLOY" ]; then
    SERVICES_TO_DEPLOY="widget dashboard api"
fi

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Ansa Rolling Deployment Script           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Services to deploy: ${GREEN}${SERVICES_TO_DEPLOY}${NC}"
echo -e "  Run migrations: ${GREEN}${RUN_MIGRATIONS}${NC}"
echo -e "  Skip build: ${GREEN}${SKIP_BUILD}${NC}"
echo ""

# Function to check if a service is healthy
check_service_health() {
    local service=$1
    local timeout=$HEALTH_CHECK_TIMEOUT
    local elapsed=0

    echo -e "${YELLOW}⏳ Waiting for ${service} to become healthy...${NC}"

    while [ $elapsed -lt $timeout ]; do
        local health_status=$(docker compose ps --format json "$service" 2>/dev/null | grep -o '"Health":"[^"]*"' | head -1)

        if echo "$health_status" | grep -q '"Health":"healthy"'; then
            echo -e "${GREEN}✓ ${service} is healthy${NC}"
            return 0
        fi

        # Check if service is starting (has health check but in start_period)
        if echo "$health_status" | grep -q '"Health":"starting"'; then
            # Continue waiting - service is starting up
            :
        # Check if service is running but has no health check
        elif docker compose ps --format json "$service" 2>/dev/null | grep -q '"State":"running"'; then
            if [ -z "$health_status" ]; then
                echo -e "${YELLOW}⚠ ${service} is running but has no health check defined${NC}"
                return 0
            fi
        fi

        sleep $HEALTH_CHECK_INTERVAL
        elapsed=$((elapsed + HEALTH_CHECK_INTERVAL))
        echo -ne "${YELLOW}  Waiting... ${elapsed}s / ${timeout}s\r${NC}"
    done

    echo -e "${RED}✗ ${service} failed to become healthy within ${timeout}s${NC}"
    return 1
}

# Function to deploy a single service
deploy_service() {
    local service=$1

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Deploying: ${service}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Build image if not skipping
    if [ "$SKIP_BUILD" = false ]; then
        echo -e "${YELLOW}🔨 Building ${service}...${NC}"
        if ! docker compose build "$service"; then
            echo -e "${RED}✗ Failed to build ${service}${NC}"
            return 1
        fi
        echo -e "${GREEN}✓ Build completed${NC}"
    else
        echo -e "${YELLOW}⏩ Skipping build for ${service}${NC}"
    fi

    # Deploy the service with --no-deps to update only this service
    echo -e "${YELLOW}🚀 Deploying ${service}...${NC}"
    if ! docker compose up -d --no-deps "$service"; then
        echo -e "${RED}✗ Failed to deploy ${service}${NC}"
        return 1
    fi

    # Wait for health check if the service has one
    if docker compose ps --format json "$service" | grep -q '"Health"'; then
        if ! check_service_health "$service"; then
            echo -e "${RED}✗ Deployment of ${service} failed health check${NC}"
            echo -e "${YELLOW}Rolling back...${NC}"
            docker compose up -d --no-deps "$service"
            return 1
        fi
    else
        # No health check, just wait a bit and verify it's running
        echo -e "${YELLOW}⏳ Waiting 5s for ${service} to start (no health check)...${NC}"
        sleep 5

        if docker compose ps --format json "$service" | grep -q '"State":"running"'; then
            echo -e "${GREEN}✓ ${service} is running${NC}"
        else
            echo -e "${RED}✗ ${service} failed to start${NC}"
            return 1
        fi
    fi

    echo -e "${GREEN}✓ Successfully deployed ${service}${NC}"
    return 0
}

# Function to run database migrations
run_migrations() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Running Database Migrations${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    echo -e "${YELLOW}⏳ Running migrations (timeout: ${MIGRATION_TIMEOUT}s)...${NC}"

    # Use docker compose run with --rm for one-off migration command
    # --no-TTY prevents hanging on input, timeout with KILL signal ensures cleanup
    if timeout --signal=KILL $MIGRATION_TIMEOUT docker compose exec --no-TTY api sh -c "pnpm db:migrate" 2>&1; then
        echo -e "${GREEN}✓ Migrations completed successfully${NC}"

        # Restart API to ensure clean state
        echo -e "${YELLOW}🔄 Restarting API service...${NC}"
        docker compose restart api

        if check_service_health api; then
            echo -e "${GREEN}✓ API restarted successfully${NC}"
            return 0
        else
            echo -e "${RED}✗ API failed to restart after migrations${NC}"
            return 1
        fi
    else
        echo -e "${RED}✗ Migrations failed or timed out${NC}"
        return 1
    fi
}

# Main deployment flow
main() {
    local start_time=$(date +%s)
    local failed_services=""

    echo -e "${YELLOW}📦 Pulling latest changes...${NC}"
    git pull || echo -e "${YELLOW}⚠ Could not pull from git (continuing anyway)${NC}"

    # Deploy services in reverse dependency order
    # widget and dashboard don't depend on each other, so deploy them first
    # Then deploy API last (most critical service)
    for service in $SERVICES_TO_DEPLOY; do
        if ! deploy_service "$service"; then
            failed_services="$failed_services $service"
            echo -e "${RED}✗ Failed to deploy ${service}, continuing with remaining services...${NC}"
        fi
    done

    # Run migrations if requested and API was deployed
    if [ "$RUN_MIGRATIONS" = true ]; then
        if echo "$SERVICES_TO_DEPLOY" | grep -q "api"; then
            if ! run_migrations; then
                failed_services="$failed_services migrations"
            fi
        else
            echo -e "${YELLOW}⚠ Skipping migrations (API not deployed)${NC}"
        fi
    fi

    # Summary
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Deployment Summary${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo -e "  Duration: ${GREEN}${duration}s${NC}"

    if [ -z "$failed_services" ]; then
        echo -e "  Status: ${GREEN}✓ All services deployed successfully${NC}"
        echo ""

        # Clean up old Docker images
        echo -e "${YELLOW}🧹 Cleaning up old Docker images...${NC}"
        docker image prune -f
        echo -e "${GREEN}✓ Cleanup complete${NC}"
        echo ""

        echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║  Deployment completed successfully! 🎉    ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
        exit 0
    else
        echo -e "  Status: ${RED}✗ Some services failed${NC}"
        echo -e "  Failed:${RED}${failed_services}${NC}"
        echo ""
        echo -e "${RED}╔════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║  Deployment completed with errors ⚠️       ║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════╝${NC}"
        exit 1
    fi
}

# Run main function
main
