import React, { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Terminal as TerminalIcon,
  Square,
  Play,
  FileSpreadsheet,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Cpu,
  Mail,
  MapPin
} from 'lucide-react';

export const TerminalRunner: React.FC = () => {
  const { currentJob, isScraping, cancelScraping, setActiveTab, showToast } = useApp();
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentJob?.logs.length]);

  const handleDownloadLogs = () => {
    if (!currentJob) return;
    const text = currentJob.logs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scraper-logs-${currentJob.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded terminal logs!', 'success');
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-emerald-400';
      case 'warn':
        return 'text-amber-400';
      case 'error':
        return 'text-rose-400';
      case 'debug':
        return 'text-slate-500';
      default:
        return 'text-cyan-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 text-blue-400 flex items-center justify-center">
            {isScraping ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            ) : currentJob?.status === 'completed' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <TerminalIcon className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">Live Scraper Terminal</h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                isScraping
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse'
                  : currentJob?.status === 'completed'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {isScraping ? 'Process Running' : currentJob ? currentJob.status : 'Idle'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              PID #4891 • {currentJob?.flags.binaryPath || './google_maps_scraper-1.18.1-linux-amd64'}
            </p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
            <span className="text-slate-400">Scraped Places:</span>{' '}
            <strong className="text-slate-100 font-mono text-sm">{currentJob?.scrapedCount || 0}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-300/80">Emails:</span>{' '}
            <strong className="text-amber-300 font-mono text-sm">{currentJob?.emailsFoundCount || 0}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
            <span className="text-slate-400">Progress:</span>{' '}
            <strong className="text-blue-400 font-mono text-sm">{currentJob?.progress || 0}%</strong>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {isScraping && (
        <div className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2">
          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
            <span>Executing Playwright scroll queries...</span>
            <span className="font-mono text-blue-400 font-semibold">{currentJob?.progress || 0}%</span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 transition-all duration-300 ease-out"
              style={{ width: `${currentJob?.progress || 0}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Terminal Window */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Terminal Title Bar */}
        <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
            </div>
            <span className="text-xs font-mono text-slate-400 ml-2">
              bash -c "{currentJob?.flags.binaryPath || './google_maps_scraper'} ..."
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isScraping ? (
              <button
                onClick={cancelScraping}
                className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs rounded-md transition-colors flex items-center gap-1.5"
              >
                <Square className="w-3 h-3 fill-rose-400 text-rose-400" />
                <span>Stop Process</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('spreadsheet')}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-md transition-colors flex items-center gap-1.5 font-medium shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Open in Excel View</span>
              </button>
            )}

            <button
              onClick={handleDownloadLogs}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Download Log Output"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Terminal Logs Viewport */}
        <div className="p-4 font-mono text-xs leading-relaxed overflow-y-auto max-h-[500px] min-h-[350px] space-y-1.5 bg-[#090d16] select-text">
          {(!currentJob || currentJob.logs.length === 0) ? (
            <div className="text-slate-600 py-16 text-center">
              <TerminalIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Ready to execute Google Maps Scraper binary.</p>
              <p className="text-[11px] text-slate-700 mt-1">Configure parameters in the Builder tab and hit "Run Maps Scraper Now".</p>
            </div>
          ) : (
            currentJob.logs.map(log => (
              <div key={log.id} className="flex items-start gap-2 text-[11px] hover:bg-slate-900/40 py-0.5 px-1 rounded">
                <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
                <span className={`font-semibold shrink-0 select-none ${getLevelColor(log.level)}`}>
                  [{log.level.toUpperCase()}]
                </span>
                <span className="text-slate-300 whitespace-pre-wrap break-all">{log.message}</span>
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Terminal Status Footer */}
        <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Target output: {currentJob?.flags.results || 'gmaps-output/results.csv'}</span>
          <span>Buffer: {currentJob?.logs.length || 0} lines</span>
        </div>
      </div>
    </div>
  );
};
