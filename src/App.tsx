/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { ScraperConfigForm } from './components/ScraperConfigForm';
import { SpreadsheetView } from './components/SpreadsheetView';
import { JobsHistoryTab } from './components/JobsHistoryTab';
import { TokenPurchaseModal } from './components/TokenPurchaseModal';
import { AuthModal } from './components/AuthModal';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeTab, toast } = useApp();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500/30">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'builder' && <ScraperConfigForm />}
        {activeTab === 'spreadsheet' && <SpreadsheetView />}
        {activeTab === 'jobs' && <JobsHistoryTab />}
      </main>

      {/* Footer */}
      <footer className="w-full bg-slate-950 border-t border-slate-900 py-4 px-4 text-center text-xs text-slate-500">
        <span>MapScraper Suite</span>
      </footer>

      {/* Modals & Drawers */}
      <TokenPurchaseModal />
      <AuthModal />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className={`px-4 py-3 rounded-xl shadow-2xl border text-xs font-medium flex items-center gap-2.5 backdrop-blur-md ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
              : toast.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-500/40'
              : 'bg-slate-900/90 text-slate-200 border-slate-700'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
