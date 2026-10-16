import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { generateDockerCompose, generateDockerfile, generateRunScript } from '../utils/dockerGenerator';
import {
  Server,
  Download,
  Copy,
  Check,
  Terminal,
  FileCode,
  Shield,
  Layers,
  Cpu,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export const DockerTab: React.FC = () => {
  const { flags, showToast } = useApp();
  const [activeFile, setActiveFile] = useState<'dockerfile' | 'compose' | 'runScript'>('dockerfile');
  const [copied, setCopied] = useState(false);

  const binaryName = flags.binaryPath.replace(/^(\.\/|\/)/, '') || 'google_maps_scraper-1.18.1-linux-amd64';

  const dockerfileContent = generateDockerfile(binaryName);
  const composeContent = generateDockerCompose(binaryName);
  const runScriptContent = generateRunScript(binaryName);

  const currentContent = activeFile === 'dockerfile'
    ? dockerfileContent
    : activeFile === 'compose'
    ? composeContent
    : runScriptContent;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    showToast(`Copied ${activeFile === 'dockerfile' ? 'Dockerfile' : activeFile === 'compose' ? 'docker-compose.yml' : 'run-docker.sh'} to clipboard!`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}!`, 'success');
  };

  const handleDownloadAll = () => {
    handleDownload('Dockerfile', dockerfileContent);
    setTimeout(() => handleDownload('docker-compose.yml', composeContent), 300);
    setTimeout(() => handleDownload('run-docker.sh', runScriptContent), 600);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Docker Deployment & Containerization Tool
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Production-Ready
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Containerize the Go maps scraper binary alongside Chromium headless dependencies and web runner
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadAll}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Download All Docker Files</span>
        </button>
      </div>

      {/* Grid: Instructions & Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Step-by-Step Instructions (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              How to Deploy with Docker
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <div>
                  <strong className="text-slate-100 block">Copy Scraper Binary</strong>
                  <p className="text-slate-400 mt-0.5">
                    Place your executable binary file <code className="text-blue-300 font-mono">{binaryName}</code> in the root directory alongside Dockerfile.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <div>
                  <strong className="text-slate-100 block">System Dependencies Included</strong>
                  <p className="text-slate-400 mt-0.5">
                    The Dockerfile automatically configures Debian Bookworm with <code className="text-slate-200">libnss3</code>, <code className="text-slate-200">libatk</code>, <code className="text-slate-200">libdrm</code>, and Chromium sandboxing so Playwright runs headlessly without errors.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <div>
                  <strong className="text-slate-100 block">Persistent Volumes</strong>
                  <p className="text-slate-400 mt-0.5">
                    The <code className="text-blue-300 font-mono">./gmaps-output</code> and <code className="text-blue-300 font-mono">./webdata</code> directories are mounted on the host machine to preserve all CSV/Excel datasets across restarts.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  4
                </span>
                <div>
                  <strong className="text-slate-100 block">Single-Command Launch</strong>
                  <pre className="mt-1.5 p-2 rounded bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                    docker compose up -d --build
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Architecture Highlights */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
            <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              Production Hardening
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Configured with shared memory size (<code className="text-slate-300">shm_size: 2gb</code>) to prevent Chromium out-of-memory crashes during deep multi-page scrolling, and automated health checks.
            </p>
          </div>
        </div>

        {/* Right: Code Viewer & Tabs (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
          {/* File switcher bar */}
          <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveFile('dockerfile')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-1.5 ${
                  activeFile === 'dockerfile'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Dockerfile</span>
              </button>

              <button
                onClick={() => setActiveFile('compose')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-1.5 ${
                  activeFile === 'compose'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>docker-compose.yml</span>
              </button>

              <button
                onClick={() => setActiveFile('runScript')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-1.5 ${
                  activeFile === 'runScript'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>run-docker.sh</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors text-xs flex items-center gap-1"
                title="Copy current file contents"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={() =>
                  handleDownload(
                    activeFile === 'dockerfile'
                      ? 'Dockerfile'
                      : activeFile === 'compose'
                      ? 'docker-compose.yml'
                      : 'run-docker.sh',
                    currentContent
                  )
                }
                className="px-2.5 py-1 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors text-xs flex items-center gap-1"
                title="Download file"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Code Body */}
          <div className="p-4 bg-slate-950 font-mono text-xs text-slate-200 overflow-x-auto max-h-[540px] overflow-y-auto leading-relaxed select-all">
            <pre className="whitespace-pre">{currentContent}</pre>
          </div>
        </div>

      </div>
    </div>
  );
};
