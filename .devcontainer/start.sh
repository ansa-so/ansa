#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🚀 Starting fresh installation..."

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please copy .env.example to .env and configure it."
  exit 1
fi

# Load environment variables
source .env

# Confirmation prompt
echo ""
echo "⚠️  WARNING: This will delete all containers, volumes, and data!"
echo "   All existing database data will be lost."
echo ""
read -p "Are you sure you want to continue? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# Stop and remove existing containers and volumes
echo "🧹 Cleaning up existing containers and volumes..."
docker compose down -v --remove-orphans 2>/dev/null || true

# Build and start containers
echo "🔨 Building and starting containers..."
docker compose up -d --build --remove-orphans

# Wait for postgres to be ready
echo "⏳ Waiting for database to be ready..."
until docker compose exec -T postgres pg_isready -U ${POSTGRES_USER:-ansa} > /dev/null 2>&1; do
  echo "  Postgres is unavailable - sleeping..."
  sleep 2
done
echo "  Postgres is ready!"

# Create vector extension
echo "🔌 Creating pgvector extension..."
docker compose exec -T postgres psql -U ${POSTGRES_USER:-ansa} -d ${POSTGRES_DB:-ansa} -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Run database migrations
echo "📦 Running database migrations..."
docker compose exec -T api sh -c "cd /app && pnpm --filter @ansa/db db:push"

# Run marketplace seeds
echo "🌱 Seeding marketplace tools..."
docker compose exec -T api sh -c "cd /app && pnpm --filter api seed:marketplace"

echo ""
echo "✅ Installation complete!"
echo ""
echo "Services are running at:"
echo "  - Dashboard: http://localhost:3000"
echo "  - API:       http://localhost:3001"
echo "  - Widget:    http://localhost:3002"
echo ""
echo "You can monitor logs with: docker compose logs -f"
