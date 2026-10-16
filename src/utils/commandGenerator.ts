import { ScraperFlags } from '../types/scraper';

export const DEFAULT_FLAGS: ScraperFlags = {
  binaryPath: './google_maps_scraper-1.18.1-linux-amd64',
  input: 'Hardware stores in Lahore\nAli and Brothers Sanitary\nLasani Hardware Store',
  results: 'gmaps-output/results.json',
  json: true,
  resume: false,
  depth: 2,
  exitOnInactivity: '3m',
  fastMode: true,
  geo: '31.5204,74.3587',
  radius: 10000,
  zoom: 15,
  useGrid: false,
  gridBbox: '31.45,74.25,31.60,74.45',
  gridCell: 1.0,
  lang: 'en',
  c: 2,
  browserPoolSize: 0,
  pagesPerBrowser: 1,
  disablePageReuse: false,
  debug: false,
  email: true,
  extraReviews: false,
  proxies: '',
  proxiesFile: '',
  cache: 'cache',
  dataFolder: 'webdata',
  addr: ':8080',
  web: false,
  awsLambda: false,
  awsRegion: 'us-east-1',
  awsAccessKey: '',
  awsSecretKey: '',
  awsLambdaChunkSize: 100,
  awsLambdaInvoker: false,
  functionName: '',
  s3Bucket: '',
  leadsdbApiKey: '',
  dsn: '',
  writer: '',
};

/**
 * Builds the exact shell command based on provided flags
 */
export function generateCliCommand(flags: ScraperFlags, queryFileName = 'queries.txt'): string {
  const parts: string[] = [flags.binaryPath || './google_maps_scraper-1.18.1-linux-amd64'];

  // Input file
  parts.push(`-input ${queryFileName}`);

  // Results file
  if (flags.results) {
    parts.push(`-results ${flags.results}`);
  }

  // JSON format
  if (flags.json) {
    parts.push('-json');
  }

  // Depth
  if (flags.depth && flags.depth !== 10) {
    parts.push(`-depth ${flags.depth}`);
  } else if (flags.depth) {
    parts.push(`-depth ${flags.depth}`);
  }

  // Inactivity timeout
  if (flags.exitOnInactivity) {
    parts.push(`-exit-on-inactivity ${flags.exitOnInactivity}`);
  }

  // Fast mode (Always enabled per system configuration)
  parts.push('-fast-mode');

  // Email extraction
  if (flags.email) {
    parts.push('-email');
  }

  // Extra reviews
  if (flags.extraReviews) {
    parts.push('-extra-reviews');
  }

  // Spatial location flags
  if (flags.useGrid && flags.gridBbox) {
    parts.push(`-grid-bbox '${flags.gridBbox}'`);
    if (flags.gridCell && flags.gridCell !== 1.0) {
      parts.push(`-grid-cell ${flags.gridCell}`);
    }
  } else {
    if (flags.geo) {
      parts.push(`-geo '${flags.geo}'`);
    }
    if (flags.radius && flags.radius !== 10000) {
      parts.push(`-radius ${flags.radius}`);
    }
    if (flags.zoom && flags.zoom !== 15) {
      parts.push(`-zoom ${flags.zoom}`);
    }
  }

  // Language
  if (flags.lang && flags.lang !== 'en') {
    parts.push(`-lang ${flags.lang}`);
  }

  // Concurrency
  if (flags.c && flags.c !== 1) {
    parts.push(`-c ${flags.c}`);
  }

  // Browser pool
  if (flags.browserPoolSize > 0) {
    parts.push(`-browser-pool-size ${flags.browserPoolSize}`);
  }
  if (flags.pagesPerBrowser > 1) {
    parts.push(`-pages-per-browser ${flags.pagesPerBrowser}`);
  }

  if (flags.disablePageReuse) {
    parts.push('-disable-page-reuse');
  }

  if (flags.debug) {
    parts.push('-debug');
  }

  if (flags.resume) {
    parts.push('-resume');
  }

  // Proxies
  if (flags.proxies) {
    parts.push(`-proxies '${flags.proxies}'`);
  }
  if (flags.proxiesFile) {
    parts.push(`-proxies-file ${flags.proxiesFile}`);
  }

  // AWS / Cloud
  if (flags.awsLambda) {
    parts.push('-aws-lambda');
    if (flags.functionName) parts.push(`-function-name ${flags.functionName}`);
    if (flags.awsRegion) parts.push(`-aws-region ${flags.awsRegion}`);
    if (flags.awsAccessKey) parts.push(`-aws-access-key ${flags.awsAccessKey}`);
    if (flags.awsSecretKey) parts.push(`-aws-secret-key ${flags.awsSecretKey}`);
  }

  if (flags.s3Bucket) {
    parts.push(`-s3-bucket ${flags.s3Bucket}`);
  }

  if (flags.leadsdbApiKey) {
    parts.push(`-leadsdb-api-key ${flags.leadsdbApiKey}`);
  }

  if (flags.dsn) {
    parts.push(`-dsn '${flags.dsn}'`);
  }

  return parts.join(' \\\n  ');
}

/**
 * Calculates estimated token consumption for a scraping task
 */
export function calculateTokenCost(flags: ScraperFlags): number {
  const queries = flags.input
    .split('\n')
    .map(q => q.trim())
    .filter(Boolean);
  const queryCount = Math.max(1, queries.length);
  const depth = flags.depth || 1;
  
  // Base cost per query: 2 tokens
  // Depth multiplier: depth * 1.5
  // Email extraction: +2 tokens per query (requires visiting target website)
  // Extra reviews: +1 token
  let perQueryCost = 2 + Math.ceil(depth * 1.5);
  if (flags.email) perQueryCost += 2;
  if (flags.extraReviews) perQueryCost += 1;
  
  if (flags.useGrid) {
    perQueryCost = Math.ceil(perQueryCost * 1.8);
  }

  return Math.max(5, queryCount * perQueryCost);
}

/**
 * Prepares bash executable script file content
 */
export function generateBashScript(flags: ScraperFlags): string {
  const cmd = generateCliCommand(flags, 'queries.txt');
  return `#!/usr/bin/env bash
# ==============================================================================
# Google Maps Scraper Runner Script
# Generated by MapScraper Web Suite
# ==============================================================================

set -euo pipefail

# Ensure output directory exists
mkdir -p $(dirname "${flags.results}")
mkdir -p "${flags.dataFolder}"

# Prepare queries file
cat << 'EOF' > queries.txt
${flags.input.trim()}
EOF

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Google Maps Scraper binary..."
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Command: ${flags.binaryPath}"

${cmd}

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Scrape run completed successfully!"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Results saved to: ${flags.results}"
`;
}
