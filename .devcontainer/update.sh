#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Updating to the latest version..."

# Stash any local changes
echo "Stashing local changes, if any..."
git stash

# Pull latest changes from git repository
echo "Pulling latest code..."
git pull

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found."
  exit 1
fi

# Rebuild and start containers
echo "Rebuilding and starting updated services..."

# Load environment variables
source .env

docker compose up -d --build --remove-orphans

# Wait for postgres to be ready
echo "Waiting for database to be ready..."
sleep 5

# Run database migrations (sync schema to database)
echo "Running database migrations..."
docker compose exec -T api pnpm --filter @ansa/db db:push

echo "Update complete. Services are running with the latest version."
echo "You can monitor logs with: docker compose logs -f"
