import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { exportToExcel } from '../utils/excelExporter';
import {
  History,
  FileSpreadsheet,
  Download,
  RotateCcw,
  Coins,
  Calendar,
  CreditCard,
  Smartphone,
  CheckCircle2,
  Clock,
  ArrowRight,
  Receipt
} from 'lucide-react';

export const JobsHistoryTab: React.FC = () => {
  const { jobsHistory, transactions, setPlaces, setActiveTab, setFlags, showToast } = useApp();
  const [subTab, setSubTab] = useState<'jobs' | 'transactions'>('jobs');

  const handleLoadJob = (job: typeof jobsHistory[0]) => {
    if (job.results && job.results.length > 0) {
      setPlaces(job.results);
      showToast(`Loaded ${job.results.length} places from job "${job.name}" into Excel sheet!`, 'success');
      setActiveTab('spreadsheet');
    } else {
      showToast('No place results stored for this job run.', 'info');
    }
  };

  const handleRerun = (job: typeof jobsHistory[0]) => {
    setFlags(job.flags);
    showToast(`Loaded flags from "${job.name}" into configurator!`, 'success');
    setActiveTab('builder');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Jobs History & Token Transactions
            </h2>
            <p className="text-xs text-slate-400">
              Audit past crawl jobs, reload previous datasets into the spreadsheet, and view payment receipts
            </p>
          </div>
        </div>

        {/* Sub tab switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setSubTab('jobs')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              subTab === 'jobs' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Scrape Jobs ({jobsHistory.length})
          </button>
          <button
            onClick={() => setSubTab('transactions')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              subTab === 'transactions' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            Token Billing ({transactions.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {subTab === 'jobs' ? (
        <div className="space-y-3">
          {jobsHistory.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl">
              <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-300">No Past Scraping Jobs Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Once you run a scrape from the configurator, the job parameters, results, and logs will be recorded here for one-click restoration.
              </p>
            </div>
          ) : (
            jobsHistory.map(job => (
              <div
                key={job.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">{job.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
                      job.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      {job.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(job.timestamp).toLocaleString()}
                    </span>
                    <span>•</span>
                    <span>
                      Places: <strong className="text-slate-200">{job.scrapedCount}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Emails: <strong className="text-amber-400">{job.emailsFoundCount}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-blue-400">
                      <Coins className="w-3.5 h-3.5" />
                      {job.tokensCost} tokens
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLoadJob(job)}
                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>View in Excel</span>
                  </button>

                  <button
                    onClick={() => exportToExcel(job.results, `${job.name.replace(/\s+/g, '_')}.xlsx`)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                    title="Direct Download Excel"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleRerun(job)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                    title="Re-run with these flags"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Transactions List */
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl">
              <Receipt className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-300">No Payment Transactions Recorded</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Any tokens acquired through Credit Card, PayPal, or JazzCash mobile wallet will show their verified invoices here.
              </p>
            </div>
          ) : (
            transactions.map(tx => (
              <div
                key={tx.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                    {tx.paymentMethod === 'jazzcash' ? (
                      <Smartphone className="w-5 h-5 text-rose-400" />
                    ) : tx.paymentMethod === 'paypal' ? (
                      <span className="font-black text-indigo-400 text-base">P</span>
                    ) : (
                      <CreditCard className="w-5 h-5 text-blue-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-100 font-mono">+{tx.tokens} Tokens</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase font-bold font-mono">
                        {tx.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {tx.accountReference} • {new Date(tx.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-slate-100 font-mono">
                    {tx.paymentMethod === 'jazzcash' ? `Rs. ${tx.amountPKR.toLocaleString()} PKR` : `$${tx.amountUSD}.00 USD`}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">Tx ID: {tx.id}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
