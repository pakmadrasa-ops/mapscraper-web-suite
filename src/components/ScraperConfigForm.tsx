import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { calculateTokenCost } from '../utils/commandGenerator';
import { MapSelector } from './MapSelector';
import {
  Play,
  RotateCcw,
  Sliders,
  Mail,
  Zap,
  Globe,
  Cpu,
  Shield,
  Cloud,
  FileText,
  ChevronDown,
  ChevronUp,
  Coins,
  Sparkles,
  Info,
  RefreshCw,
  FolderOpen,
  CheckCircle2,
  Download
} from 'lucide-react';

export const ScraperConfigForm: React.FC = () => {
  const {
    flags,
    updateFlag,
    resetFlags,
    startScraping,
    isScraping,
    tokens,
    setIsTokenModalOpen,
    showToast,
    engineMode,
    setEngineMode,
    syncFromOutputFile
  } = useApp();

  const [activeAccordion, setActiveAccordion] = useState<string>('location');
  const [isSyncing, setIsSyncing] = useState(false);

  const tokenCost = calculateTokenCost(flags);

  const toggleAccordion = (name: string) => {
    setActiveAccordion(prev => (prev === name ? '' : name));
  };

  const handleSampleQueries = (sample: string) => {
    updateFlag('input', sample);
    showToast('Loaded sample query preset!', 'info');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        const content = event.target?.result as string;
        if (content) {
          updateFlag('input', content);
          showToast(`Loaded ${content.split('\n').filter(Boolean).length} queries from ${file.name}`, 'success');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    await syncFromOutputFile();
    setTimeout(() => setIsSyncing(false), 300);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Larger, Clearer Typography */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-5 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 shrink-0">
            <Sliders className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
              Google Maps Scraper GUI
              <span className="text-xs font-mono font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                v1.18.1 Linux-x86_64
              </span>
            </h1>
            <p className="text-base text-slate-300 mt-1">
              Select search criteria with interactive map and GUI flags. Scraper executes in the background and saves directly to <span className="text-blue-300 font-mono font-semibold">gmaps-output/</span>.
            </p>
          </div>
        </div>

        {/* Engine switcher toggle */}
        <div className="flex items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-sm">
          <button
            onClick={() => setEngineMode('binary')}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              engineMode === 'binary'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            Binary Scraper
          </button>
          <button
            onClick={() => setEngineMode('google_api')}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              engineMode === 'google_api'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Google Places API
          </button>
        </div>
      </div>

      {/* Main Grid: Left Form Controls, Right Background Status & Launch Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Target Queries Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-lg font-bold text-slate-100 flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-blue-400" />
                Target Search Queries
              </label>
              
              {/* File Upload Trigger */}
              <label className="text-sm text-blue-400 hover:text-blue-300 font-semibold cursor-pointer flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 transition-colors">
                <Download className="w-4 h-4 rotate-180" />
                Import .txt Queries
                <input type="file" accept=".txt,.csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <textarea
              rows={4}
              value={flags.input}
              onChange={e => updateFlag('input', e.target.value)}
              placeholder="Enter search queries (one per line, e.g.):&#10;Hardware stores in Lahore&#10;Ali and Brothers Sanitary&#10;Lasani Hardware Store"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-base font-mono text-slate-200 focus:outline-none focus:border-blue-500 transition-colors leading-relaxed"
            />

            {/* Quick Query Templates with Clear Font */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-sm">
              <span className="text-sm text-slate-400 font-medium">Quick Presets:</span>
              <button
                type="button"
                onClick={() => handleSampleQueries('Hardware stores in Lahore\nElectric stores in Lahore\nSanitary stores in Lahore')}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-sm font-medium text-slate-200 border border-slate-700 transition-colors"
              >
                🛠️ Hardware & Sanitary Stores
              </button>
              <button
                type="button"
                onClick={() => handleSampleQueries('Dentists in Gulberg Lahore\nDental clinics in DHA Lahore')}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-sm font-medium text-slate-200 border border-slate-700 transition-colors"
              >
                🦷 Dental Clinics
              </button>
              <button
                type="button"
                onClick={() => handleSampleQueries('Software companies in Lahore\nIT companies in Gulberg Lahore')}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-sm font-medium text-slate-200 border border-slate-700 transition-colors"
              >
                💻 Software & IT Companies
              </button>
            </div>
          </div>

          {/* Interactive Map Component */}
          <MapSelector />

          {/* Parameter Accordions with Bigger Fonts */}
          <div className="space-y-4">
            
            {/* Crawl Limits, Depth & Speed */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleAccordion('crawl')}
                className="w-full px-6 py-4.5 bg-slate-950/60 flex items-center justify-between text-left text-base font-bold text-slate-200 hover:bg-slate-950 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Sliders className="w-5 h-5 text-purple-400" />
                  <span>Crawl Limits, Depth & Timing</span>
                </div>
                {activeAccordion === 'crawl' ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>

              {activeAccordion === 'crawl' && (
                <div className="p-6 space-y-5 border-t border-slate-800 bg-slate-900/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Depth */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-base font-semibold text-slate-200">
                          Scroll Depth (<code className="text-purple-400 font-mono text-sm">-depth</code>)
                        </label>
                        <span className="text-sm font-mono font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded">
                          Level {flags.depth}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={30}
                        step={1}
                        value={flags.depth}
                        onChange={e => updateFlag('depth', parseInt(e.target.value))}
                        className="w-full accent-purple-500 cursor-pointer h-2.5 bg-slate-800 rounded-lg"
                      />
                      <span className="text-xs text-slate-400 mt-1.5 block">Scroll pages in search results pane (default 10)</span>
                    </div>

                    {/* Exit on Inactivity */}
                    <div>
                      <label className="text-base font-semibold text-slate-200 block mb-2">
                        Exit on Inactivity (<code className="text-purple-400 font-mono text-sm">-exit-on-inactivity</code>)
                      </label>
                      <select
                        value={flags.exitOnInactivity}
                        onChange={e => updateFlag('exitOnInactivity', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-base rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                      >
                        <option value="1m">1 minute (Quick)</option>
                        <option value="2m">2 minutes</option>
                        <option value="3m">3 minutes (Standard)</option>
                        <option value="5m">5 minutes</option>
                        <option value="10m">10 minutes (Deep scrape)</option>
                      </select>
                      <span className="text-xs text-slate-400 mt-1.5 block">Closes browser after no new places load</span>
                    </div>

                    {/* Concurrency */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-base font-semibold text-slate-200">
                          Worker Concurrency (<code className="text-purple-400 font-mono text-sm">-c</code>)
                        </label>
                        <span className="text-sm font-mono font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded">
                          {flags.c} workers
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={8}
                        step={1}
                        value={flags.c}
                        onChange={e => updateFlag('c', parseInt(e.target.value))}
                        className="w-full accent-purple-500 cursor-pointer h-2.5 bg-slate-800 rounded-lg"
                      />
                      <span className="text-xs text-slate-400 mt-1.5 block">Parallel scraping processes (default: 1)</span>
                    </div>

                    {/* Language */}
                    <div>
                      <label className="text-base font-semibold text-slate-200 block mb-2">
                        Maps Language (<code className="text-purple-400 font-mono text-sm">-lang</code>)
                      </label>
                      <select
                        value={flags.lang || 'en'}
                        onChange={e => updateFlag('lang', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-base rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                      >
                        <option value="en">English (en)</option>
                        <option value="ur">Urdu (ur)</option>
                        <option value="ar">Arabic (ar)</option>
                        <option value="es">Spanish (es)</option>
                        <option value="fr">French (fr)</option>
                        <option value="de">German (de)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Data Extraction Options (Email, Fast Mode, Extra Reviews) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleAccordion('extraction')}
                className="w-full px-6 py-4.5 bg-slate-950/60 flex items-center justify-between text-left text-base font-bold text-slate-200 hover:bg-slate-950 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-amber-400" />
                  <span>Data Extraction & Email Enrichment</span>
                </div>
                {activeAccordion === 'extraction' ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>

              {activeAccordion === 'extraction' && (
                <div className="p-6 space-y-4 border-t border-slate-800 bg-slate-900/50">
                  <div className="space-y-3">
                    {/* Extract Email Toggle */}
                    <label className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={flags.email}
                        onChange={e => updateFlag('email', e.target.checked)}
                        className="w-5 h-5 mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-400 bg-slate-900"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-base font-bold text-slate-200">
                            Extract Emails (<code className="text-amber-400 font-mono text-sm">-email</code>)
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            Recommended
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">
                          Crawls linked business websites to extract contact emails into your dataset.
                        </p>
                      </div>
                    </label>

                    {/* Extra Reviews Toggle */}
                    <label className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-blue-500/40 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={flags.extraReviews}
                        onChange={e => updateFlag('extraReviews', e.target.checked)}
                        className="w-5 h-5 mt-0.5 rounded border-slate-700 text-blue-500 focus:ring-blue-400 bg-slate-900"
                      />
                      <div className="flex-1">
                        <span className="text-base font-bold text-slate-200">
                          Collect Extra Reviews (<code className="text-blue-400 font-mono text-sm">-extra-reviews</code>)
                        </span>
                        <p className="text-sm text-slate-400 mt-1">
                          Collects detailed user feedback, star ratings, and reviewers' metadata.
                        </p>
                      </div>
                    </label>

                    {/* Fast Mode (Always Active - Non-selectable per user requirement) */}
                    <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/30">
                      <Zap className="w-5 h-5 mt-0.5 text-cyan-400 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-base font-bold text-slate-200">
                            Fast Mode (<code className="text-cyan-400 font-mono text-sm">-fast-mode</code>)
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            ⚡ Always Active
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">
                          Enabled permanently for all scrape tasks to deliver high-speed background throughput.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Right Sidebar: Token Cost, Background Status & Silent Execution Action (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Main Action Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                Query Token Estimation
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Balance:</span>
                <span className="text-lg font-bold text-amber-400 font-mono">{tokens} tokens</span>
              </div>
            </div>

            {/* Token details */}
            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 space-y-3 text-base">
              <div className="flex justify-between text-slate-300">
                <span>Targets:</span>
                <span className="font-mono text-slate-100 font-semibold">{flags.input.split('\n').filter(Boolean).length || 1} queries</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Scroll Multiplier:</span>
                <span className="font-mono text-slate-100 font-semibold">Depth {flags.depth}</span>
              </div>
              {flags.email && (
                <div className="flex justify-between text-amber-300 font-medium">
                  <span>Website Email Extraction:</span>
                  <span className="font-mono">+2 tokens/query</span>
                </div>
              )}
              <div className="h-px bg-slate-800 my-1"></div>
              <div className="flex justify-between text-lg font-bold text-slate-100">
                <span>Total Token Cost:</span>
                <span className="font-mono text-blue-400 text-xl">{tokenCost} tokens</span>
              </div>
            </div>

            {/* Background Runner Engine Status */}
            <div className="p-4.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-sm font-bold uppercase tracking-wider text-slate-200">Background Engine Status</span>
                </div>
                <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Ready
                </span>
              </div>

              <div className="text-sm text-slate-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Output Format:</span>
                  <span className="text-emerald-400 font-mono font-semibold">JSON lines (-json flag)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Destination:</span>
                  <span className="text-slate-200 font-mono text-xs">{flags.results || 'gmaps-output/results.json'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Process Mode:</span>
                  <span className="text-blue-400 font-semibold">Silent Background Execution</span>
                </div>
              </div>
            </div>

            {/* Launch Button with Larger Font & High Contrast */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                disabled={isScraping}
                onClick={startScraping}
                className="w-full py-4.5 px-6 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-lg font-bold rounded-xl transition-all shadow-xl shadow-blue-500/25 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
              >
                {isScraping ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Scraper Running in Background...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6 fill-white group-hover:scale-110 transition-transform" />
                    <span>Run Scraper Now</span>
                  </>
                )}
              </button>

              {/* Sync existing results button */}
              <button
                type="button"
                onClick={handleSyncData}
                disabled={isSyncing}
                className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-base font-semibold rounded-xl transition-colors flex items-center justify-center gap-2.5"
                title="Directly read and refresh the latest results from gmaps-output/results.json"
              >
                <RefreshCw className={`w-4 h-4 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync Latest Output from gmaps-output/</span>
              </button>

              {tokens < tokenCost && (
                <button
                  type="button"
                  onClick={() => setIsTokenModalOpen(true)}
                  className="w-full py-3 px-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-base font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Coins className="w-5 h-5" />
                  Top Up Tokens (Credit Card, PayPal, JazzCash)
                </button>
              )}
            </div>

          </div>

          {/* Destination Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2.5">
              <FolderOpen className="w-5 h-5 text-blue-400" />
              Output Destination File
            </h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">File Path</label>
              <input
                type="text"
                value={flags.results || 'gmaps-output/results.json'}
                onChange={e => updateFlag('results', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-sm rounded-xl px-4 py-2.5 text-slate-200 font-mono"
              />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              The scraper binary automatically writes each scraped place as JSON to this file in the background. The app loads and presents it in the Excel spreadsheet view automatically.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
