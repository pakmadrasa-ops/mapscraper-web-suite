import React from 'react';
import { useApp } from '../context/AppContext';
import {
  MapPin,
  Sliders,
  FileSpreadsheet,
  Terminal,
  History,
  Server,
  Coins,
  Plus,
  User,
  LogOut,
  LogIn
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    places,
    isScraping,
    tokens,
    user,
    setIsTokenModalOpen,
    setIsAuthModalOpen,
    logout
  } = useApp();

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-slate-100">
                MapScraper <span className="text-blue-400">Suite</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                v1.18.1
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
              Binary CLI Web Wrapper & Lead Engine
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('builder')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'builder'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Config & Map</span>
          </button>

          <button
            onClick={() => setActiveTab('spreadsheet')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'spreadsheet'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel Sheet</span>
            {places.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'spreadsheet' ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-300'
              }`}>
                {places.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'terminal'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Terminal</span>
            {isScraping && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'jobs'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </button>

          <button
            onClick={() => setActiveTab('docker')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'docker'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Docker Hub</span>
          </button>
        </nav>

        {/* Right: Tokens & User Profile */}
        <div className="flex items-center gap-3">
          
          {/* Token Balance Pill */}
          <button
            onClick={() => setIsTokenModalOpen(true)}
            className="flex items-center gap-2.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-xl transition-all shadow-sm group"
            title="Refill tokens via Credit Card, PayPal, or JazzCash"
          >
            <div className="flex items-center gap-1.5 text-amber-400 font-bold font-mono text-sm">
              <Coins className="w-4 h-4" />
              <span>{tokens}</span>
            </div>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">tokens</span>
            <span className="w-5 h-5 rounded-lg bg-blue-600 group-hover:bg-blue-500 text-white flex items-center justify-center transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </span>
          </button>

          {/* User Profile / Auth */}
          {user ? (
            <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
              <div className="flex items-center gap-2">
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.name}`}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                />
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-semibold text-slate-200 leading-tight truncate max-w-[110px]">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-blue-400 font-mono leading-tight">
                    {user.plan} Account
                  </div>
                </div>
              </div>

              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

        </div>

      </div>

      {/* Mobile Sub Navigation */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800/80 px-2 py-1.5 bg-slate-950 text-xs">
        <button
          onClick={() => setActiveTab('builder')}
          className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 ${
            activeTab === 'builder' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Sliders className="w-3 h-3" /> Config
        </button>
        <button
          onClick={() => setActiveTab('spreadsheet')}
          className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 ${
            activeTab === 'spreadsheet' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <FileSpreadsheet className="w-3 h-3" /> Sheet ({places.length})
        </button>
        <button
          onClick={() => setActiveTab('terminal')}
          className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 ${
            activeTab === 'terminal' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Terminal className="w-3 h-3" /> CLI {isScraping && '•'}
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 ${
            activeTab === 'jobs' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <History className="w-3 h-3" /> Jobs
        </button>
        <button
          onClick={() => setActiveTab('docker')}
          className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 ${
            activeTab === 'docker' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Server className="w-3 h-3" /> Docker
        </button>
      </div>
    </header>
  );
};
