#!/usr/bin/env bash
# Quickstart script for MapScraper Docker Deployment
set -euo pipefail

echo "=========================================================="
echo " Starting Google Maps Scraper Web Suite in Docker"
echo "=========================================================="

mkdir -p gmaps-output webdata cache

if [ ! -f "google_maps_scraper-1.18.1-linux-amd64" ]; then
    echo "⚠️ Note: Put your 'google_maps_scraper-1.18.1-linux-amd64' binary in this directory if running in local CLI mode."
fi

echo "==> Building and launching Docker containers..."
docker compose up -d --build

echo ""
echo "✅ Scraper Web Suite is running!"
echo "👉 Open Web Interface: http://localhost:8080 or http://localhost:3000"
echo "👉 Output files will be synced to: ./gmaps-output"
echo ""
echo "To view live container logs:"
echo "  docker compose logs -f"
