import React from 'react';
import { useApp } from '../context/AppContext';
import { exportToExcel } from '../utils/excelExporter';
import {
  History,
  FileSpreadsheet,
  Download,
  RotateCcw,
  Calendar
} from 'lucide-react';

export const JobsHistoryTab: React.FC = () => {
  const { jobsHistory, setPlaces, setActiveTab, setFlags, showToast } = useApp();

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
              Search History
            </h2>
            <p className="text-xs text-slate-400">
              Review previous searches, reopen their results, or reuse their settings
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {jobsHistory.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl">
            <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-300">No Previous Searches Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Completed searches will appear here so you can revisit their results or reuse the settings.
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
                      : job.status === 'partial'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
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
                  title="Re-use these search settings"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
