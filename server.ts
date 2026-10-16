import express from 'express';
import fs from 'fs';
import path from 'path';
import { spawn, type ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { parseScraperJsonOutput } from './src/utils/jsonParser.ts';
import type { PlaceResult } from './src/types/scraper.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/**
 * Determine port accurately:
 * In development (NODE_ENV !== 'production'), always use 3000 (AI Studio standard).
 * In production (Cloud Run), use process.env.PORT || 8080.
 * Also parses --port CLI args if passed.
 */
function resolvePort(): number {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' || args[i] === '-p') {
      const p = parseInt(args[i + 1], 10);
      if (!isNaN(p)) return p;
    }
    if (args[i].startsWith('--port=')) {
      const p = parseInt(args[i].split('=')[1], 10);
      if (!isNaN(p)) return p;
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    return 3000;
  }

  return parseInt(process.env.PORT || '8080', 10);
}

const PORT = resolvePort();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure gmaps-output and webdata directories exist
const outputDir = path.resolve(process.cwd(), 'gmaps-output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Active background process tracker
let activeScraperProcess: ChildProcess | null = null;
let currentJobState: {
  id: string;
  isRunning: boolean;
  startTime: number;
  progress: number;
  logs: Array<{ timestamp: string; level: string; message: string }>;
  scrapedCount: number;
  outputFile: string;
  exitCode: number | null;
} = {
  id: '',
  isRunning: false,
  startTime: 0,
  progress: 0,
  logs: [],
  scrapedCount: 0,
  outputFile: '',
  exitCode: null,
};

// In-memory cache for parsed places to optimize disk reads & speed up execution
interface PlacesCacheEntry {
  mtime: number;
  places: PlaceResult[];
}
const placesCache = new Map<string, PlacesCacheEntry>();

/**
 * Searches candidate binary paths in prioritized order
 */
function findScraperBinary(preferredPath?: string): string | null {
  const candidates = [
    preferredPath,
    path.resolve(outputDir, 'google_maps_scraper-1.18.1-linux-amd64'),
    path.resolve(process.cwd(), 'google_maps_scraper-1.18.1-linux-amd64'),
    path.resolve(outputDir, 'google_maps_scraper'),
    path.resolve(process.cwd(), 'google_maps_scraper'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        return candidate;
      } catch {
        try {
          fs.chmodSync(candidate, 0o755);
          return candidate;
        } catch {
          return candidate;
        }
      }
    }
  }
  return null;
}

/**
 * Helper: Read latest places from gmaps-output with high performance file caching
 */
function readLatestOutputPlaces(preferredFile?: string): { filePath: string; places: PlaceResult[] } {
  const fileCandidates = [
    preferredFile,
    path.resolve(outputDir, 'results.json'),
    path.resolve(outputDir, 'results.csv'),
    path.resolve(process.cwd(), 'results.json'),
  ].filter(Boolean) as string[];

  for (const filePath of fileCandidates) {
    if (fs.existsSync(filePath)) {
      try {
        const stat = fs.statSync(filePath);
        const cached = placesCache.get(filePath);
        if (cached && cached.mtime === stat.mtimeMs) {
          return { filePath, places: cached.places };
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const places = parseScraperJsonOutput(content);
        placesCache.set(filePath, { mtime: stat.mtimeMs, places });
        if (places && places.length > 0) {
          return { filePath, places };
        }
        if (filePath === preferredFile) {
          return { filePath, places };
        }
      } catch (err: any) {
        console.error(`Error reading ${filePath}:`, err);
      }
    }
  }
  return { filePath: '', places: [] };
}

/**
 * API: Read results directly from disk (fast cached read)
 */
app.get('/api/scrape/results', (req, res) => {
  const { filePath, places } = readLatestOutputPlaces(currentJobState.outputFile || undefined);

  if (places.length > 0) {
    return res.json({
      success: true,
      filePath,
      total: places.length,
      places,
    });
  }

  return res.json({
    success: Boolean(filePath),
    message: filePath ? 'No places found in scraper output.' : 'No results file found in gmaps-output yet.',
    filePath,
    total: 0,
    places: [],
  });
});

/**
 * API: Poll active job status & live logs
 */
app.get('/api/scrape/status', (req, res) => {
  res.json({
    ...currentJobState,
    elapsedMs: currentJobState.startTime ? Date.now() - currentJobState.startTime : 0,
  });
});

/**
 * API: Cancel running scraper job
 */
app.post('/api/scrape/cancel', (req, res) => {
  if (activeScraperProcess) {
    try {
      activeScraperProcess.kill('SIGTERM');
      currentJobState.logs.push({
        timestamp: new Date().toLocaleTimeString(),
        level: 'warn',
        message: '[CANCELLED] Termination signal sent to scraper process.',
      });
    } catch (err: any) {
      console.warn('Error killing process:', err);
    }
    activeScraperProcess = null;
  }
  currentJobState.isRunning = false;
  return res.json({ success: true, message: 'Scraper process cancelled.' });
});

/**
 * API: Run the scraper command in the background with -json flag
 * Optimized to be completely non-blocking and immediate.
 */
app.post('/api/scrape/run', async (req, res) => {
  // If already running, prevent duplicate spawn conflict
  if (currentJobState.isRunning && activeScraperProcess) {
    return res.status(409).json({
      success: false,
      message: 'A scrape job is already currently executing in the background.',
    });
  }

  const { flags } = req.body;
  const rawInput = flags?.input || 'Hardware stores in Lahore';
  const depth = flags?.depth || 2;
  const exitOnInactivity = flags?.exitOnInactivity || '3m';
  const geo = flags?.geo || '31.4237,74.2136';
  const radius = flags?.radius || 10000;
  const zoom = flags?.zoom || 15;
  const outputFilePath = path.resolve(outputDir, 'results.json');
  const queryFilePath = path.resolve(outputDir, 'queries.txt');

  // Save queries file
  fs.writeFileSync(queryFilePath, rawInput.trim(), 'utf-8');

  const jobId = `job_${Date.now()}`;
  currentJobState = {
    id: jobId,
    isRunning: true,
    startTime: Date.now(),
    progress: 15,
    logs: [],
    scrapedCount: 0,
    outputFile: outputFilePath,
    exitCode: null,
  };

  const addLog = (level: string, message: string) => {
    // Keep max 250 logs to prevent memory leak
    if (currentJobState.logs.length > 250) {
      currentJobState.logs.shift();
    }
    currentJobState.logs.push({
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
    });
  };

  addLog('info', `[LAUNCH] Initializing background scraper job #${jobId}`);
  addLog('info', `[TARGET] Query: "${rawInput.split('\n')[0]}"`);
  addLog('info', `[CONFIG] -json mode enforced | Output destination: ${outputFilePath}`);

  const binaryPath = findScraperBinary(flags?.binaryPath);

  if (binaryPath) {
    addLog('info', `[BINARY] Executable found: ${binaryPath}`);
    const args = [
      '-input', queryFilePath,
      '-results', outputFilePath,
      '-json',
      '-depth', String(depth),
      '-exit-on-inactivity', exitOnInactivity,
      '-geo', geo,
      '-radius', String(radius),
      '-zoom', String(zoom),
    ];

    if (flags?.email) args.push('-email');
    // Always use fast mode per user requirement
    args.push('-fast-mode');
    if (flags?.extraReviews) args.push('-extra-reviews');
    if (flags?.c) args.push('-c', String(flags.c));
    if (flags?.lang) args.push('-lang', flags.lang);

    addLog('info', `[EXEC] Running: ${path.basename(binaryPath)} ${args.join(' ')}`);

    try {
      fs.writeFileSync(outputFilePath, '', 'utf-8');
      placesCache.delete(outputFilePath);
      const child = spawn(binaryPath, args, {
        cwd: process.cwd(),
        env: { ...process.env, DISPLAY: process.env.DISPLAY || ':99' },
      });

      activeScraperProcess = child;

      child.stdout.on('data', data => {
        const text = data.toString().trim();
        if (text) {
          addLog('info', text);
          currentJobState.progress = Math.min(95, currentJobState.progress + 5);
        }
      });

      child.stderr.on('data', data => {
        const text = data.toString().trim();
        if (text) addLog('warn', text);
      });

      child.on('error', err => {
        addLog('error', `Process spawn error: ${err.message}`);
        currentJobState.exitCode = -1;
        currentJobState.isRunning = false;
        activeScraperProcess = null;
      });

      child.on('close', code => {
        currentJobState.exitCode = code ?? -1;
        currentJobState.isRunning = false;
        activeScraperProcess = null;
        placesCache.delete(outputFilePath);
        const { places } = readLatestOutputPlaces(outputFilePath);
        currentJobState.scrapedCount = places.length;
        if (code === 0) currentJobState.progress = 100;
        addLog(code === 0 ? 'success' : 'error', `Scraper finished with exit code ${code ?? 'unknown'}`);
      });

      // Quick 200ms grace period to check if binary initialized or output was immediate
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (err: any) {
      addLog('error', `Failed to execute binary: ${err.message}`);
      currentJobState.exitCode = -1;
      currentJobState.isRunning = false;
      activeScraperProcess = null;
    }
  } else {
    addLog('error', `[ERROR] Scraper binary not found: ${path.basename(outputFilePath)} cannot be generated.`);
    currentJobState.exitCode = -1;
    currentJobState.isRunning = false;
  }

  // Read latest results immediately (fast cached)
  const places = binaryPath ? readLatestOutputPlaces(outputFilePath).places : [];
  currentJobState.scrapedCount = places.length;
  if (!activeScraperProcess && currentJobState.exitCode === 0) {
    currentJobState.progress = 100;
  }

  if (binaryPath) {
    addLog('info', '[READY] Scraper launched; waiting for it to finish before loading results.');
  }

  return res.json({
    success: true,
    jobId,
    isRunning: currentJobState.isRunning,
    total: places.length,
    places: binaryPath ? places : [],
    logs: currentJobState.logs,
    progress: currentJobState.progress,
    exitCode: currentJobState.exitCode,
    started: Boolean(binaryPath),
  });
});

/**
 * Server setup with Vite middleware in dev and static files in production
 */
async function setupServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(process.cwd(), 'dist');

  if (isProd && fs.existsSync(distPath)) {
    console.log(`[PROD] Serving production build from ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    console.log(`[DEV] Mounting Vite middleware mode on port ${PORT}...`);
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: process.env.DISABLE_HMR !== 'true',
        },
        appType: 'spa',
      });

      // Mount Vite's dev middlewares (handles scripts, HMR, assets)
      app.use(vite.middlewares);

      // Serve index.html transformed by Vite for SPA client routes
      app.use('*', async (req, res, next) => {
        const url = req.originalUrl;
        if (url.startsWith('/api')) {
          return next();
        }
        try {
          const indexPath = path.resolve(process.cwd(), 'index.html');
          if (!fs.existsSync(indexPath)) {
            return res.status(404).send('index.html not found');
          }
          let template = fs.readFileSync(indexPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } catch (e: any) {
          vite.ssrFixStacktrace(e);
          next(e);
        }
      });
    } catch (err) {
      console.warn('Vite middleware initialization warning:', err);
    }
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`MapScraper Web Suite running at http://0.0.0.0:${PORT} (PID ${process.pid})`);
  });

  // Handle graceful shutdowns
  const shutdown = () => {
    if (activeScraperProcess) {
      try {
        activeScraperProcess.kill('SIGTERM');
      } catch {}
    }
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

setupServer().catch(err => {
  console.error('Server boot failed:', err);
});
