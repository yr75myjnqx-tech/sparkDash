#!/bin/bash

# Exit immediately if any command fails
set -e

echo "Stopping and removing containers..."
docker compose down

echo "Building images (without cache)..."
docker compose build 

echo "Starting services in detached mode..."
docker compose up -d

echo "✅ All done! Services are now running."
