<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Google Maps Search Engine

Search Google Maps places, configure search areas, and explore results in a spreadsheet.

## Run Locally

**Prerequisites:** Node.js 20.19+ or 22.12+.


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

The search interface is available without an account or sign-in. Searches and job history are held in the running app; run a single server instance.

## Install on a Remote Linux Server

These steps are for Ubuntu or Debian on an `x86_64`/`amd64` server. The scraper executable included in this project is a Linux `x86_64` binary. For an ARM server, provide a compatible scraper binary before running searches.

### Required packages

- Node.js 22 LTS and npm (Node.js 20.19+ also works)
- `ca-certificates` and `curl` to install Node.js from NodeSource

The scraper binary is already included. No Python, database server, or Gemini API key is required for the current app.

### Install and build

1. Connect to the server over SSH and go to the project directory (replace the example path with where you moved the folder):

   ```bash
   cd /opt/mapscraper-web-suite
   ```

2. Install Node.js and npm:

   ```bash
   sudo apt update
   sudo apt install -y ca-certificates curl
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt install -y nodejs
   node --version
   npm --version
   ```

   Confirm Node.js is version 20.19 or newer (or 22.12 or newer).

3. Install the project dependencies, make sure the scraper binary is executable, and build the production frontend:

   ```bash
   npm ci
   chmod +x google_maps_scraper-1.18.1-linux-amd64
   mkdir -p gmaps-output
   npm run build
   ```

4. Start the production server:

   ```bash
   NODE_ENV=production PORT=8080 npm start
   ```

   From another SSH session, check that it responds:

   ```bash
   curl -I http://127.0.0.1:8080
   ```

   Press `Ctrl+C` to stop the foreground server. The app is then available at `http://SERVER_IP:8080` if the server firewall allows that port.

### Keep it running with systemd

For a persistent service, create a dedicated system account and ensure it owns the project and output directory. Replace the path below if your project is elsewhere:

```bash
sudo useradd --system --user-group --home-dir /opt/mapscraper-web-suite --shell /usr/sbin/nologin mapscraper
sudo chown -R mapscraper:mapscraper /opt/mapscraper-web-suite
```

Create `/etc/systemd/system/mapscraper.service` with:

```ini
[Unit]
Description=Google Maps Search Engine
After=network.target

[Service]
Type=simple
User=mapscraper
Group=mapscraper
WorkingDirectory=/opt/mapscraper-web-suite
Environment=NODE_ENV=production
Environment=PORT=8080
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mapscraper
sudo systemctl status mapscraper
sudo journalctl -u mapscraper -f
```

The `gmaps-output` directory must remain writable by the service account so it can store queries and results. For public production access, use a domain with HTTPS and a reverse proxy such as Nginx or Caddy; avoid exposing the app's port directly when a reverse proxy is configured.

Or download the [binary release](https://github.com/gosom/google-maps-scraper/releases) for your platform.

### Docker note

The included `docker-compose.yml` references a `Dockerfile`, but this project does not currently include one. Use the native installation above unless you add a Dockerfile.
