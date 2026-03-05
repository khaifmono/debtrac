#!/bin/bash
set -e

echo "Pulling latest changes..."
git pull origin "$(git branch --show-current)"

echo "Rebuilding and restarting containers..."
docker compose up --build -d

echo "Done! App is running at http://localhost:3001"
