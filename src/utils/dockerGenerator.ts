export function generateDockerfile(binaryName = 'google_maps_scraper-1.18.1-linux-amd64'): string {
  return `# ==============================================================================
# Google Maps Scraper Docker Container
# Tailored for: ${binaryName}
# ==============================================================================
FROM debian:bookworm-slim

# Prevent interactive prompts during package installs
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV PORT=8080

# Install required system dependencies, Chromium / Playwright headless runtime,
# fonts, SSL certificates, and Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \\
    ca-certificates \\
    curl \\
    wget \\
    gnupg \\
    procps \\
    xvfb \\
    libnss3 \\
    libatk1.0-0 \\
    libatk-bridge2.0-0 \\
    libcups2 \\
    libdrm2 \\
    libxcomposite1 \\
    libxdamage1 \\
    libxfixes3 \\
    libxrandr2 \\
    libgbm1 \\
    libxkbcommon0 \\
    libpango-1.0-0 \\
    libasound2 \\
    fonts-liberation \\
    fonts-noto-color-emoji \\
    chromium \\
    chromium-sandbox \\
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \\
    && apt-get install -y nodejs \\
    && rm -rf /var/lib/apt/lists/*

# Set up working directory
WORKDIR /app

# Ensure directories for inputs, outputs, cache, and web runner data
RUN mkdir -p /app/gmaps-output /app/webdata /app/cache

# Copy scraper binary and give execution permissions
COPY ${binaryName} /app/${binaryName}
RUN chmod +x /app/${binaryName}

# Copy package files and install web wrapper application
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Expose web GUI and API ports
EXPOSE 8080 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:8080/ || curl -f http://localhost:3000/ || exit 1

# Default command: launch web wrapper on port 8080
CMD ["npm", "start"]
`;
}

export function generateDockerCompose(binaryName = 'google_maps_scraper-1.18.1-linux-amd64'): string {
  return `version: '3.8'

services:
  map-scraper-suite:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: gmaps-scraper-suite
    restart: unless-stopped
    ports:
      - "8080:8080"
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SCRAPER_BINARY=/app/${binaryName}
      - PORT=8080
    volumes:
      # Persistent results output and scraped datasets
      - ./gmaps-output:/app/gmaps-output
      # Persistent scraper cache and web runner data
      - ./webdata:/app/webdata
      - ./cache:/app/cache
    shm_size: 2gb
    cap_add:
      - SYS_ADMIN # Needed for Chromium sandboxing if required
`;
}

export function generateRunScript(binaryName = 'google_maps_scraper-1.18.1-linux-amd64'): string {
  return `#!/usr/bin/env bash
# ==============================================================================
# Quick Docker Build & Run Helper
# ==============================================================================
set -e

echo "==> Building Docker image for Google Maps Scraper..."
docker build -t gmaps-scraper:latest .

echo "==> Launching container with Docker Compose..."
docker compose up -d

echo ""
echo "✅ Scraper Web Suite is running!"
echo "👉 Open Web Interface: http://localhost:8080 or http://localhost:3000"
echo "👉 Output files will be synced to: ./gmaps-output"
echo ""
echo "To view live container logs:"
echo "  docker compose logs -f"
`;
}
