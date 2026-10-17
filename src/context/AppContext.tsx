import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { LogLine, PlaceResult, ScraperFlags, ScrapingJob } from '../types/scraper';
import { DEFAULT_FLAGS, generateCliCommand } from '../utils/commandGenerator';
import { parseScraperJsonOutput } from '../utils/jsonParser';

interface AppContextType {
  flags: ScraperFlags;
  setFlags: React.Dispatch<React.SetStateAction<ScraperFlags>>;
  updateFlag: <K extends keyof ScraperFlags>(key: K, value: ScraperFlags[K]) => void;
  resetFlags: () => void;
  
  activeTab: 'builder' | 'spreadsheet' | 'jobs';
  setActiveTab: (tab: 'builder' | 'spreadsheet' | 'jobs') => void;
  
  currentJob: ScrapingJob | null;
  jobsHistory: ScrapingJob[];
  places: PlaceResult[];
  setPlaces: React.Dispatch<React.SetStateAction<PlaceResult[]>>;
  selectedPlace: PlaceResult | null;
  setSelectedPlace: (p: PlaceResult | null) => void;
  
  isScraping: boolean;
  startScraping: () => Promise<void>;
  cancelScraping: () => void;
  syncFromOutputFile: (activateSpreadsheet?: boolean) => Promise<void>;
  
  isShareModalOpen: boolean;
  setIsShareModalOpen: (open: boolean) => void;
  sharedAppUrl: string;
  
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  
}

const AppContext = createContext<AppContextType | undefined>(undefined);



export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flags, setFlags] = useState<ScraperFlags>(() => {
    const saved = localStorage.getItem('mapscraper_flags');
    if (!saved) return DEFAULT_FLAGS;
    const savedFlags = JSON.parse(saved) as ScraperFlags;
    return savedFlags.depth === 2
      ? { ...savedFlags, depth: DEFAULT_FLAGS.depth }
      : savedFlags;
  });

  const [activeTab, setActiveTab] = useState<'builder' | 'spreadsheet' | 'jobs'>('builder');
  
  const [places, setPlaces] = useState<PlaceResult[]>(() => {
    const saved = localStorage.getItem('mapscraper_places');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [currentJob, setCurrentJob] = useState<ScrapingJob | null>(null);
  const [jobsHistory, setJobsHistory] = useState<ScrapingJob[]>(() => {
    const saved = localStorage.getItem('mapscraper_jobs');
    return saved ? JSON.parse(saved) : [];
  });

  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const sharedAppUrl = typeof window !== 'undefined'
    ? `${window.location.origin}`
    : 'https://ais-pre-pbyslsdlw43r6cr66yu5g2-239953540573.asia-northeast1.run.app';

  const cancelRef = useRef<boolean>(false);

  useEffect(() => {
    localStorage.setItem('mapscraper_flags', JSON.stringify(flags));
  }, [flags]);

  useEffect(() => {
    localStorage.setItem('mapscraper_places', JSON.stringify(places));
  }, [places]);

  useEffect(() => {
    localStorage.setItem('mapscraper_jobs', JSON.stringify(jobsHistory));
  }, [jobsHistory]);

  // Try reading gmaps-output on mount if available
  useEffect(() => {
    syncFromOutputFile(false).catch(() => {});
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const updateFlag = <K extends keyof ScraperFlags>(key: K, value: ScraperFlags[K]) => {
    setFlags(prev => ({ ...prev, [key]: value }));
  };

  const resetFlags = () => {
    setFlags(DEFAULT_FLAGS);
    showToast('Reset scraper parameters to default values.', 'info');
  };

  /**
   * Syncs data directly from actual gmaps-output/results.json
   */
  const syncFromOutputFile = async (activateSpreadsheet = true) => {
    try {
      const res = await fetch('/api/scrape/results');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.places)) {
          setPlaces(data.places);
          if (data.places.length === 0) {
            showToast('No places are available in the scraper output.', 'info');
            return;
          }
          if (activateSpreadsheet) {
            setActiveTab('spreadsheet');
            showToast(`Synced ${data.places.length} places from actual results file!`, 'success');
          }
          return;
        }
      }
    } catch {
      // Backend api might not be mounted in pure preview mode
    }
  };

  /**
   * Starts the scraper and loads its results when it finishes.
   */
  const startScraping = async () => {
    cancelRef.current = false;
    setIsScraping(true);

    const jobId = `job_${Date.now()}`;
    // Force -json flag as requested
    const runFlags = { ...flags, json: true, results: flags.results || 'gmaps-output/results.json' };
    const generatedCmd = generateCliCommand(runFlags);

    const newJob: ScrapingJob = {
      id: jobId,
      name: runFlags.input.split('\n')[0]?.trim() || 'Google Maps Scrape',
      timestamp: new Date().toISOString(),
      status: 'running',
      flags: runFlags,
      generatedCommand: generatedCmd,
      progress: 10,
      totalEstimated: Math.min(50, (flags.depth || 1) * 8),
      scrapedCount: 0,
      emailsFoundCount: 0,
      logs: [
        {
          id: 'log_1',
          timestamp: new Date().toLocaleTimeString(),
          level: 'info',
          message: 'Scraping started.',
        },
        {
          id: 'log_2',
          timestamp: new Date().toLocaleTimeString(),
          level: 'info',
          message: `[TARGET FILE] Output configured to: ${runFlags.results}`,
        }
      ],
      results: [],
    };

    setCurrentJob(newJob);
    showToast('Scraping started.', 'info');

    try {
      const startResponse = await fetch('/api/scrape/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flags: runFlags }),
      });
      const startData = await startResponse.json();
      if (!startResponse.ok || !startData.success) {
        throw new Error(startData.message || `Scraper request failed (${startResponse.status}).`);
      }

      const serverJobId = typeof startData.jobId === 'string' ? startData.jobId : newJob.id;
      let latestJob: ScrapingJob = { ...newJob, id: serverJobId };
      let jobStatus = {
        isRunning: Boolean(startData.isRunning),
        exitCode: startData.exitCode as number | null | undefined,
        progress: typeof startData.progress === 'number' ? startData.progress : latestJob.progress,
        scrapedCount: typeof startData.total === 'number' ? startData.total : latestJob.scrapedCount,
        logs: Array.isArray(startData.logs) ? startData.logs : [],
      };

      while (jobStatus.isRunning) {
        if (cancelRef.current) return;
        await new Promise(resolve => window.setTimeout(resolve, 1000));
        if (cancelRef.current) return;

        const statusResponse = await fetch('/api/scrape/status');
        const statusData = await statusResponse.json();
        if (!statusResponse.ok) {
          throw new Error(statusData.message || `Could not read scraper status (${statusResponse.status}).`);
        }
        if (statusData.id !== serverJobId) {
          throw new Error('The scraper status no longer matches the job started by this request.');
        }
        jobStatus = {
          isRunning: Boolean(statusData.isRunning),
          exitCode: statusData.exitCode as number | null | undefined,
          progress: typeof statusData.progress === 'number' ? statusData.progress : latestJob.progress,
          scrapedCount: typeof statusData.scrapedCount === 'number' ? statusData.scrapedCount : latestJob.scrapedCount,
          logs: Array.isArray(statusData.logs) ? statusData.logs : latestJob.logs,
        };

        latestJob = {
          ...latestJob,
          progress: jobStatus.progress,
          scrapedCount: jobStatus.scrapedCount,
          logs: jobStatus.logs.map((log: { timestamp: string; level: LogLine['level']; message: string }, index: number) => ({
            id: `srv_${index}`,
            ...log,
          })),
        };
        setCurrentJob(latestJob);
      }

      if (cancelRef.current) return;

      const succeeded = jobStatus.exitCode === 0;

      let finalResults: PlaceResult[] = [];
      if (startData.started) {
        const resultsResponse = await fetch('/api/scrape/results');
        const resultsData = await resultsResponse.json();
        if (!resultsResponse.ok) {
          throw new Error(resultsData.message || `Could not load scraper results (${resultsResponse.status}).`);
        }
        finalResults = Array.isArray(resultsData.places) ? resultsData.places : [];
      }
      setPlaces(finalResults);

      const completionLog: LogLine = {
        id: 'log_done',
        timestamp: new Date().toLocaleTimeString(),
        level: succeeded ? 'success' : 'error',
        message: succeeded
          ? `[COMPLETED] Scraper finished. Loaded ${finalResults.length} places into Excel view.`
          : `[FAILED] Scraper exited with code ${jobStatus.exitCode ?? 'unknown'}. Loaded ${finalResults.length} available places.`,
      };
      const finishedJob: ScrapingJob = {
        ...latestJob,
        status: succeeded ? 'completed' : 'failed',
        progress: succeeded ? 100 : latestJob.progress,
        scrapedCount: finalResults.length,
        emailsFoundCount: finalResults.filter(p => !!p.email).length,
        results: finalResults,
        logs: [...latestJob.logs, completionLog],
        error: succeeded ? undefined : `Scraper exited with code ${jobStatus.exitCode ?? 'unknown'}.`,
      };

      setCurrentJob(finishedJob);
      setJobsHistory(prev => [finishedJob, ...prev]);

      if (succeeded) {
        showToast(
          finalResults.length > 0
            ? `Scrape finished! Loaded ${finalResults.length} places.`
            : 'Scrape finished with no places found.',
          'success'
        );
      } else {
        showToast(`Scraper failed. Loaded ${finalResults.length} available places.`, 'error');
      }
      if (succeeded) setActiveTab('spreadsheet');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const failedJob: ScrapingJob = {
        ...newJob,
        status: 'failed',
        error: message,
        logs: [...newJob.logs, {
          id: 'log_error',
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `[FAILED] ${message}`,
        }],
      };
      setCurrentJob(failedJob);
      setJobsHistory(prev => [failedJob, ...prev]);
      showToast(`Scraper error: ${message}`, 'error');
    } finally {
      setIsScraping(false);
    }
  };

  const cancelScraping = () => {
    cancelRef.current = true;
    setIsScraping(false);
    fetch('/api/scrape/cancel', { method: 'POST' }).catch(err => {
      const message = err instanceof Error ? err.message : String(err);
      showToast(`Could not stop scraper: ${message}`, 'error');
    });
    showToast('Scraper stop requested.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        flags,
        setFlags,
        updateFlag,
        resetFlags,
        activeTab,
        setActiveTab,
        currentJob,
        jobsHistory,
        places,
        setPlaces,
        selectedPlace,
        setSelectedPlace,
        isScraping,
        startScraping,
        cancelScraping,
        syncFromOutputFile,
        isShareModalOpen,
        setIsShareModalOpen,
        sharedAppUrl,
        toast,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
