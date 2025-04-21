'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { formatTime } from '../../../lib/utils/timeUtils';
import { useTheme } from '../../../context/ThemeContext';
import Link from 'next/link';
import DebugNav from '@/app/components/debug/DebugNav';
import { 
  CronJob, 
  HistoryEntry, 
  listCronJobs, 
  getCronJob, 
  getJobHistory, 
  startJob, 
  stopJob, 
  deleteCronJob, 
  createCronJob,
  validateCronExpression,
  describeCronExpression,
  getNextRunTime,
  updateCronJob
} from '../../../lib/client/cronClient';
import CronSelector from '@/app/components/CronSelector';

export default function CronDebugPage() {
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<CronJob | null>(null);
  const [jobHistory, setJobHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [isEditingJob, setIsEditingJob] = useState(false);
  const [newJob, setNewJob] = useState({
    name: '',
    description: '',
    cronExpression: '*/5 * * * *',
    enabled: true
  });
  const [jobToEdit, setJobToEdit] = useState<CronJob | null>(null);
  const [isCronExpressionValid, setIsCronExpressionValid] = useState(true);
  const [estimatedNextRun, setEstimatedNextRun] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { theme } = useTheme();

  // Calculate service stats
  const upServices = cronJobs.filter(job => job.status === 'running').length;
  const downServices = cronJobs.filter(job => job.status === 'stopped').length;

  // No longer forcing light mode, just tracking theme changes
  useEffect(() => {
    addLog(`Using ${theme} theme mode`);
    
    return () => {
      // No need to reset theme on unmount
    };
  }, [theme]);

  // Auto-refresh effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (autoRefresh && refreshInterval > 0) {
      addLog(`Auto-refresh enabled: refreshing every ${refreshInterval} seconds`);
      intervalId = setInterval(() => {
        addLog('Auto-refresh: fetching updated data...');
        fetchCronJobs();
        if (selectedJob) {
          fetchJobDetails(selectedJob.id);
        }
      }, refreshInterval * 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refreshInterval, selectedJob]);

  // Check auth status on page load
  useEffect(() => {
    async function checkAuth() {
      try {
        addLog('Verifying authentication...');
        const response = await fetch('/api/auth/validate', {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        const data = await response.json();
        
        if (!data.valid) {
          addLog('Not authenticated - redirecting to login page');
          router.push(`/login?from=${encodeURIComponent('/debug/ping/cron')}`);
          return;
        }
        
        addLog('Authentication verified - proceeding with data fetch');
        fetchCronJobs();
      } catch (err) {
        addLog(`Error verifying authentication: ${(err as Error).message}`);
        setError(`Authentication check failed: ${(err as Error).message}`);
      }
    }
    
    checkAuth();
  }, [router]);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    setLogs(prev => [`${timestamp} - ${message}`, ...prev].slice(0, 100));
  };

  const fetchCronJobs = async () => {
    try {
      setIsLoading(true);
      addLog('Fetching cron jobs...');
      
      const jobs = await listCronJobs();
      setCronJobs(jobs);
      
      // Auto-select the first job if there's at least one job and no job is currently selected
      if (jobs.length > 0 && !selectedJob) {
        addLog(`Auto-selecting job: ${jobs[0].name}`);
        fetchJobDetails(jobs[0].id);
      }
      
      addLog(`Fetched ${jobs.length} cron jobs`);
      setError(null); // Clear any previous errors on success
    } catch (err) {
      setError((err as Error).message);
      addLog(`Error: ${(err as Error).message}`);
      
      // Check for authentication errors
      if ((err as Error).message.includes('401 Unauthorized')) {
        addLog('Authentication error - redirecting to login page');
        router.push(`/login?from=${encodeURIComponent('/debug/ping/cron')}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJobDetails = async (id: string) => {
    try {
      addLog(`Fetching details for job ${id}...`);
      
      const job = await getCronJob(id);
      if (job) {
        setSelectedJob(job);
        addLog(`Job details loaded successfully`);
        
        // Also fetch job history
        fetchJobHistory(id);
      } else {
        throw new Error("Failed to fetch job details");
      }
    } catch (err) {
      addLog(`Error loading job details: ${(err as Error).message}`);
    }
  };

  const fetchJobHistory = async (id: string) => {
    try {
      addLog(`Fetching history for job ${id}...`);
      
      const history = await getJobHistory(id, 20);
      setJobHistory(history);
      addLog(`Job history loaded successfully (${history.length} entries)`);
    } catch (err) {
      addLog(`Error loading job history: ${(err as Error).message}`);
    }
  };

  const handleStartJob = async (id: string) => {
    try {
      addLog(`Starting job ${id}...`);
      
      const success = await startJob(id);
      addLog(`Job started successfully: ${success ? 'Success' : 'Failed'}`);
      
      // Refresh job list and selected job if needed
      fetchCronJobs();
      if (selectedJob?.id === id) {
        fetchJobDetails(id);
      }
    } catch (err) {
      addLog(`Error starting job: ${(err as Error).message}`);
    }
  };

  const handleStopJob = async (id: string) => {
    try {
      addLog(`Stopping job ${id}...`);
      
      const success = await stopJob(id);
      addLog(`Job stopped successfully: ${success ? 'Success' : 'Failed'}`);
      
      // Refresh job list and selected job if needed
      fetchCronJobs();
      if (selectedJob?.id === id) {
        fetchJobDetails(id);
      }
    } catch (err) {
      addLog(`Error stopping job: ${(err as Error).message}`);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job?')) {
      return;
    }
    
    try {
      addLog(`Deleting job ${id}...`);
      
      const success = await deleteCronJob(id);
      addLog(`Job deleted successfully: ${success ? 'Success' : 'Failed'}`);
      
      // Refresh job list and clear selected job if needed
      if (selectedJob?.id === id) {
        setSelectedJob(null);
        setJobHistory([]);
      }
      
      fetchCronJobs();
    } catch (err) {
      addLog(`Error deleting job: ${(err as Error).message}`);
    }
  };

  const handleCreateJob = async () => {
    try {
      addLog(`Creating new cron job...`);
      
      const job = await createCronJob(newJob);
      
      if (job) {
        addLog(`Job created successfully: ${job.id}`);
        
        // Reset form and refresh job list
        setNewJob({
          name: '',
          description: '',
          cronExpression: '*/5 * * * *',
          enabled: true
        });
        setIsCreatingJob(false);
        fetchCronJobs();
      } else {
        throw new Error("Failed to create job");
      }
    } catch (err) {
      addLog(`Error creating job: ${(err as Error).message}`);
    }
  };

  const handleUpdateJob = async () => {
    if (!jobToEdit) return;
    
    try {
      addLog(`Updating cron job ${jobToEdit.id}...`);
      
      const updatedJob = await updateCronJob(jobToEdit.id, {
        name: jobToEdit.name,
        description: jobToEdit.description || '',
        cronExpression: jobToEdit.cronExpression,
        enabled: jobToEdit.enabled
      });
      
      if (updatedJob) {
        addLog(`Job updated successfully: ${updatedJob.id}`);
        
        // Reset form and refresh job list
        setIsEditingJob(false);
        setJobToEdit(null);
        fetchCronJobs();
        
        // If this was the selected job, update it
        if (selectedJob?.id === updatedJob.id) {
          setSelectedJob(updatedJob);
        }
      } else {
        throw new Error("Failed to update job");
      }
    } catch (err) {
      addLog(`Error updating job: ${(err as Error).message}`);
    }
  };
  
  const handleEditJob = (job: CronJob) => {
    setJobToEdit({...job});
    setIsEditingJob(true);
    addLog(`Editing job "${job.name}"`);
  };

  const handleCronExpressionUpdate = (value: string) => {
    setNewJob({ ...newJob, cronExpression: value });
    const isValid = validateCronExpression(value);
    setIsCronExpressionValid(isValid);
    
    // Update estimated next run time
    if (isValid) {
      const nextRun = getNextRunTime(value);
      setEstimatedNextRun(nextRun);
    } else {
      setEstimatedNextRun(null);
    }
  };

  const handleEditJobCronExpressionUpdate = (value: string) => {
    if (!jobToEdit) return;
    
    const isValid = validateCronExpression(value);
    
    setJobToEdit({
      ...jobToEdit,
      cronExpression: value
    });
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'running':
        return <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-800">Running</span>;
      case 'stopped':
        return <span className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-800">Stopped</span>;
      case 'error':
        return <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-800">Error</span>;
      default:
        return <span className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms/1000).toFixed(2)}s`;
  };

  const formatMilliseconds = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms/1000).toFixed(2)}s`;
  };

  // Clone an existing job
  const handleCloneJob = (job: CronJob) => {
    setNewJob({
      name: `${job.name} (Clone)`,
      description: job.description || '',
      cronExpression: job.cronExpression,
      enabled: false // Set to disabled by default for safety
    });
    setIsCronExpressionValid(true);
    try {
      const nextDate = getNextRunTime(job.cronExpression);
      setEstimatedNextRun(nextDate);
    } catch (error) {
      console.error('Error parsing cron expression:', error);
      setEstimatedNextRun(null);
    }
    setIsCreatingJob(true);
    addLog(`Cloning job "${job.name}" as template for new job`);
  };

  // Export all cron jobs as JSON
  const handleExportJobs = () => {
    try {
      addLog('Exporting cron jobs as JSON...');
      
      // Create a formatted export with timestamp and metadata
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        jobs: cronJobs.map(job => ({
          name: job.name,
          description: job.description || '',
          cronExpression: job.cronExpression,
          enabled: job.enabled
        }))
      };
      
      // Convert to JSON string
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Create download link
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cron-jobs-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      addLog('Export completed successfully');
    } catch (err) {
      addLog(`Error exporting jobs: ${(err as Error).message}`);
    }
  };
  
  // Import cron jobs from JSON
  const handleImportJobs = async () => {
    try {
      setImportError(null);
      
      if (!importData.trim()) {
        setImportError('Please enter or upload JSON data');
        return;
      }
      
      addLog('Importing cron jobs from JSON...');
      
      // Parse the JSON data
      let parsedData;
      try {
        parsedData = JSON.parse(importData);
      } catch (err) {
        setImportError('Invalid JSON format');
        addLog('Import failed: Invalid JSON format');
        return;
      }
      
      // Validate the data structure
      if (!parsedData.jobs || !Array.isArray(parsedData.jobs)) {
        setImportError('Invalid import format: missing or invalid jobs array');
        addLog('Import failed: Invalid data structure');
        return;
      }
      
      // Import each job
      const results = [];
      for (const jobData of parsedData.jobs) {
        // Validate required fields
        if (!jobData.name || !jobData.cronExpression) {
          results.push({ 
            success: false, 
            name: jobData.name || 'Unknown job', 
            error: 'Missing required fields' 
          });
          continue;
        }
        
        // Validate cron expression
        if (!validateCronExpression(jobData.cronExpression)) {
          results.push({ 
            success: false, 
            name: jobData.name, 
            error: 'Invalid cron expression' 
          });
          continue;
        }
        
        // Create the job
        try {
          const job = await createCronJob({
            name: jobData.name,
            description: jobData.description || '',
            cronExpression: jobData.cronExpression,
            enabled: jobData.enabled !== undefined ? jobData.enabled : false
          });
          
          if (job) {
            results.push({ success: true, name: jobData.name, id: job.id });
          } else {
            results.push({ 
              success: false, 
              name: jobData.name, 
              error: 'Failed to create job' 
            });
          }
        } catch (err) {
          results.push({ 
            success: false, 
            name: jobData.name, 
            error: (err as Error).message 
          });
        }
      }
      
      // Log results
      const successCount = results.filter(r => r.success).length;
      addLog(`Import completed: ${successCount}/${parsedData.jobs.length} jobs imported successfully`);
      
      // Show results
      const resultMessages = results.map(r => 
        `${r.name}: ${r.success ? 'Success' : `Failed - ${r.error}`}`
      );
      
      alert(`Import Results:\n\n${resultMessages.join('\n')}`);
      
      // Close modal and refresh
      setIsImportModalOpen(false);
      setImportData('');
      fetchCronJobs();
    } catch (err) {
      setImportError(`Import failed: ${(err as Error).message}`);
      addLog(`Error importing jobs: ${(err as Error).message}`);
    }
  };
  
  // Handle file upload for import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImportData(event.target.result as string);
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    fetchCronJobs();
  }, []);

  return (
    <div className="bg-background text-foreground">
      <DebugNav />
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cron Jobs Debug</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage scheduled jobs
            </p>
          </div>
          <div className="flex space-x-3 items-center">
            <div className="flex items-center mr-3">
              <input
                type="checkbox"
                id="auto-refresh"
                className="mr-2"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <label htmlFor="auto-refresh" className="text-sm text-muted-foreground">
                Auto-refresh
              </label>
              {autoRefresh && (
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="ml-2 text-sm border border-border rounded px-1 py-0.5 text-muted-foreground bg-background"
                >
                  <option value={10}>10s</option>
                  <option value={30}>30s</option>
                  <option value={60}>1m</option>
                  <option value={300}>5m</option>
                </select>
              )}
            </div>
            <button 
              onClick={fetchCronJobs}
              className="bg-muted hover:bg-muted/80 text-muted-foreground px-3 py-1.5 rounded-md text-sm font-medium flex items-center"
              title="Refresh data"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="bg-muted hover:bg-muted/80 text-muted-foreground px-3 py-1.5 rounded-md text-sm font-medium flex items-center"
              title="Import jobs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
              </svg>
              Import
            </button>
            <button 
              onClick={handleExportJobs}
              className="bg-muted hover:bg-muted/80 text-muted-foreground px-3 py-1.5 rounded-md text-sm font-medium flex items-center"
              title="Export jobs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
            <button 
              onClick={() => setIsCreatingJob(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Job
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Stats overview */}
          <div className="md:col-span-12 mb-2">
            <div className="bg-card p-4 rounded-lg shadow-sm border border-border">
              <h2 className="text-lg font-semibold mb-3 text-foreground">Cron Jobs Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex flex-col rounded-md border p-4 transition-colors text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded-full bg-white/90 dark:bg-gray-900/80">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-medium dark:text-gray-200">Total Jobs</h3>
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className="text-xl font-bold dark:text-white">{cronJobs.length}</span>
                    <div className="text-xs mt-1 leading-tight opacity-80 dark:text-gray-400">{upServices} running, {downServices} stopped</div>
                  </div>
                </div>
                
                <div className="flex flex-col rounded-md border p-4 transition-colors text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded-full bg-white/90 dark:bg-gray-900/80">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-medium dark:text-gray-200">Running</h3>
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className="text-xl font-bold dark:text-white">
                      {cronJobs.filter(job => job.status === 'running').length}
                    </span>
                    <div className="text-xs mt-1 leading-tight opacity-80 dark:text-gray-400">Active scheduled jobs</div>
                  </div>
                </div>
                
                <div className="flex flex-col rounded-md border p-4 transition-colors text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-900/50 bg-gray-50 dark:bg-gray-950/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded-full bg-white/90 dark:bg-gray-900/80">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-medium dark:text-gray-200">Stopped</h3>
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className="text-xl font-bold dark:text-white">
                      {cronJobs.filter(job => job.status === 'stopped').length}
                    </span>
                    <div className="text-xs mt-1 leading-tight opacity-80 dark:text-gray-400">Inactive jobs</div>
                  </div>
                </div>
                
                <div className="flex flex-col rounded-md border p-4 transition-colors text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded-full bg-white/90 dark:bg-gray-900/80">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-medium dark:text-gray-200">Errors</h3>
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className="text-xl font-bold dark:text-white">
                      {cronJobs.filter(job => job.status === 'error' || job.lastRunStatus === 'failure').length}
                    </span>
                    <div className="text-xs mt-1 leading-tight opacity-80 dark:text-gray-400">Jobs with errors</div>
                  </div>
                </div>
                
                <div className="flex flex-col rounded-md border p-4 transition-colors text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded-full bg-white/90 dark:bg-gray-900/80">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-medium dark:text-gray-200">Next Run</h3>
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className="text-xl font-bold dark:text-white">
                      {(() => {
                        const nextRunJobs = cronJobs
                          .filter(job => job.nextRun && job.status === 'running')
                          .sort((a, b) => (a.nextRun || 0) - (b.nextRun || 0));
                        
                        if (nextRunJobs.length === 0) {
                          return 'None';
                        }
                        
                        const nextJob = nextRunJobs[0];
                        const timeLeft = Math.round(((nextJob.nextRun || 0) - Date.now()) / 1000);
                        
                        if (timeLeft < 0) return 'Imminent';
                        if (timeLeft < 60) return `${timeLeft}s`;
                        if (timeLeft < 3600) return `${Math.floor(timeLeft / 60)}m`;
                        return `${Math.floor(timeLeft / 3600)}h`;
                      })()}
                    </span>
                    <div className="text-xs mt-1 leading-tight opacity-80 dark:text-gray-400">Time until next execution</div>
                  </div>
                </div>
              </div>
              
              {cronJobs.length > 0 && (
                <div className="mt-4 text-xs text-muted-foreground border-t border-border pt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                    <div>Most frequent: {
                      (() => {
                        const expressions = cronJobs.map(job => job.cronExpression);
                        const counts = expressions.reduce((acc, expr) => {
                          acc[expr] = (acc[expr] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>);
                        
                        const mostCommon = Object.entries(counts)
                          .sort((a, b) => b[1] - a[1])[0];
                        
                        return mostCommon ? 
                          <span className="font-mono text-foreground">{mostCommon[0]}</span> : 
                          'N/A';
                      })()
                    }</div>
                    
                    <div>Oldest job: {
                      (() => {
                        if (cronJobs.length === 0) return 'N/A';
                        
                        const oldest = cronJobs.reduce((oldest, job) => 
                          job.createdAt < oldest.createdAt ? job : oldest, cronJobs[0]);
                        
                        return oldest ? 
                          <span className="text-foreground">{oldest.name} ({formatTime(oldest.createdAt)})</span> : 
                          'N/A';
                      })()
                    }</div>
                    
                    <div>Latest run: {
                      (() => {
                        const withRuns = cronJobs.filter(job => job.lastRun);
                        
                        if (withRuns.length === 0) return 'Never';
                        
                        const latest = withRuns.reduce((latest, job) => 
                          (job.lastRun || 0) > (latest.lastRun || 0) ? job : latest, withRuns[0]);
                        
                        return latest ? 
                          <span className="text-foreground">{latest.name} ({formatTime(latest.lastRun || 0)})</span> : 
                          'N/A';
                      })()
                    }</div>
                    
                    <div>Success rate: {
                      (() => {
                        const withStatus = cronJobs.filter(job => job.lastRunStatus);
                        
                        if (withStatus.length === 0) return 'N/A';
                        
                        const successful = withStatus.filter(job => job.lastRunStatus === 'success').length;
                        const rate = Math.round((successful / withStatus.length) * 100);
                        
                        return `${rate}% (${successful}/${withStatus.length})`;
                      })()
                    }</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Left Column - Cron Jobs List */}
          <div className="md:col-span-4">
            <div className="bg-card p-4 rounded-lg shadow-sm border border-border mb-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-foreground">Cron Jobs</h2>
                <button 
                  className="px-3 py-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded text-sm"
                  onClick={() => setIsCreatingJob(true)}
                >
                  New Job
                </button>
              </div>
              
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading...</div>
              ) : error ? (
                <div className="text-destructive text-center py-4">{error}</div>
              ) : cronJobs.length === 0 ? (
                <div className="text-muted-foreground text-center py-4">No cron jobs found</div>
              ) : (
                <div className="overflow-auto max-h-[500px] space-y-3">
                  {cronJobs.map(job => (
                    <div 
                      key={job.id}
                      className={`border border-border rounded-lg p-3 hover:bg-accent/50 cursor-pointer ${selectedJob?.id === job.id ? 'bg-accent border-accent' : ''}`}
                      onClick={() => fetchJobDetails(job.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-foreground">{job.name}</div>
                          {job.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-full" title={job.description}>
                              {job.description}
                            </div>
                          )}
                        </div>
                        <div className={`${job.enabled ? 'bg-accent/50 text-foreground' : 'bg-muted text-muted-foreground'} px-2 py-0.5 rounded text-xs font-medium`}>
                          {job.status}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Schedule:</span>
                          <div className="font-mono text-foreground">
                            {job.cronExpression}
                          </div>
                          <div className="text-muted-foreground">
                            {describeCronExpression(job.cronExpression)}
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-muted-foreground">Next Run:</span>
                          <div className="text-foreground">
                            {job.nextRun ? (
                              formatTime(job.nextRun)
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-muted-foreground">Last Run:</span>
                          <div className="text-foreground">
                            {job.lastRun ? (
                              formatTime(job.lastRun)
                            ) : (
                              <span className="text-muted-foreground">Never</span>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <div>
                            {job.lastRunStatus ? (
                              job.lastRunStatus === 'success' ? (
                                <span className="text-green-500">Success</span>
                              ) : (
                                <span className="text-destructive">Failure</span>
                              )
                            ) : (
                              <span className="text-muted-foreground">Never run</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-1 mt-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleStopJob(job.id); }}
                          className={`text-xs px-2 py-1 rounded border ${
                            job.enabled 
                              ? 'bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20' 
                              : 'bg-green-500/10 hover:bg-green-500/20 text-green-500 border-green-500/20'
                          }`}
                        >
                          {job.enabled ? 'Stop' : 'Start'}
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEditJob(job); }}
                          className="text-xs px-2 py-1 rounded bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleCloneJob(job); }}
                          className="text-xs px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20"
                        >
                          Clone
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.id); }}
                          className="text-xs px-2 py-1 rounded bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card p-4 rounded-lg shadow-sm border border-border">
              <h2 className="text-lg font-semibold mb-2 text-foreground">Debug Logs</h2>
              <div className="bg-muted/50 p-2 rounded border border-border text-xs font-mono h-[200px] overflow-auto">
                {logs.length === 0 ? (
                  <div className="text-muted-foreground">No logs yet</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="whitespace-pre-wrap mb-1 text-foreground">{log}</div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Job Details & Creation/Editing */}
          <div className="md:col-span-8">
            {isCreatingJob ? (
              <div className="bg-card p-4 rounded-lg shadow-sm border border-border mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Create New Cron Job</h2>
                  <button 
                    className="px-3 py-1 bg-muted hover:bg-muted/80 text-muted-foreground rounded text-sm"
                    onClick={() => setIsCreatingJob(false)}
                  >
                    Cancel
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      value={newJob.name}
                      onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
                      placeholder="Daily ping job"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      value={newJob.description}
                      onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                      placeholder="Job description (optional)"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Schedule <span className="text-destructive">*</span>
                    </label>
                    <CronSelector 
                      value={newJob.cronExpression}
                      onChange={handleCronExpressionUpdate}
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enabled"
                      className="mr-2"
                      checked={newJob.enabled}
                      onChange={(e) => setNewJob({ ...newJob, enabled: e.target.checked })}
                    />
                    <label htmlFor="enabled" className="text-sm font-medium text-foreground">
                      Enable job immediately
                    </label>
                  </div>
                  
                  <div className="mt-2">
                    <button
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded disabled:bg-muted disabled:text-muted-foreground"
                      onClick={handleCreateJob}
                      disabled={!newJob.name || !isCronExpressionValid}
                    >
                      Create Job
                    </button>
                  </div>
                </div>
              </div>
            ) : isEditingJob && jobToEdit ? (
              <div className="bg-card p-4 rounded-lg shadow-sm border border-border mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Edit Cron Job</h2>
                  <button 
                    className="px-3 py-1 bg-muted hover:bg-muted/80 text-muted-foreground rounded text-sm"
                    onClick={() => {
                      setIsEditingJob(false);
                      setJobToEdit(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      value={jobToEdit.name}
                      onChange={(e) => setJobToEdit({ ...jobToEdit, name: e.target.value })}
                      placeholder="Job name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      value={jobToEdit.description || ''}
                      onChange={(e) => setJobToEdit({ ...jobToEdit, description: e.target.value })}
                      placeholder="Job description (optional)"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Schedule <span className="text-destructive">*</span>
                    </label>
                    <CronSelector 
                      value={jobToEdit.cronExpression}
                      onChange={handleEditJobCronExpressionUpdate}
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="edit-enabled"
                      className="mr-2"
                      checked={jobToEdit.enabled}
                      onChange={(e) => setJobToEdit({ ...jobToEdit, enabled: e.target.checked })}
                    />
                    <label htmlFor="edit-enabled" className="text-sm font-medium text-foreground">
                      Enable job
                    </label>
                  </div>
                  
                  <div className="mt-2">
                    <button
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded disabled:bg-muted disabled:text-muted-foreground"
                      onClick={handleUpdateJob}
                      disabled={!jobToEdit.name || !validateCronExpression(jobToEdit.cronExpression)}
                    >
                      Update Job
                    </button>
                  </div>
                </div>
              </div>
            ) : selectedJob ? (
              <div className="bg-card p-4 rounded-lg shadow-sm border border-border mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-foreground">{selectedJob.name}</h2>
                  <div className="flex gap-2">
                    {selectedJob.status === 'running' ? (
                      <button 
                        className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded text-sm"
                        onClick={() => handleStopJob(selectedJob.id)}
                      >
                        Stop Job
                      </button>
                    ) : (
                      <button 
                        className="px-3 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 rounded text-sm"
                        onClick={() => handleStartJob(selectedJob.id)}
                      >
                        Start Job
                      </button>
                    )}
                    <button 
                      className="px-3 py-1 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 rounded text-sm"
                      onClick={() => handleDeleteJob(selectedJob.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                    <div className="text-foreground">
                      {selectedJob.status === 'running' ? (
                        <span className="inline-block px-2 py-1 rounded bg-accent/30 text-foreground">Running</span>
                      ) : selectedJob.status === 'stopped' ? (
                        <span className="inline-block px-2 py-1 rounded bg-muted text-muted-foreground">Stopped</span>
                      ) : (
                        <span className="inline-block px-2 py-1 rounded bg-destructive/20 text-destructive">Error</span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Cron Expression</h3>
                    <div className="font-mono text-sm text-foreground">{selectedJob.cronExpression}</div>
                    <div className="text-xs text-muted-foreground">
                      {describeCronExpression(selectedJob.cronExpression)}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">ID</h3>
                    <div className="font-mono text-xs break-all text-foreground">{selectedJob.id}</div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Enabled</h3>
                    <div className={selectedJob.enabled ? "text-green-500" : "text-destructive"}>
                      {selectedJob.enabled ? "Yes" : "No"}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Created At</h3>
                    <div className="text-foreground">{formatTime(selectedJob.createdAt)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(selectedJob.createdAt).toISOString()}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Updated At</h3>
                    <div className="text-foreground">{formatTime(selectedJob.updatedAt)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(selectedJob.updatedAt).toISOString()}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Run</h3>
                    <div className="text-foreground">
                      {selectedJob.lastRun ? formatTime(selectedJob.lastRun) : 'Never'}
                    </div>
                    {selectedJob.lastRun && (
                      <div className="text-xs text-muted-foreground">
                        {new Date(selectedJob.lastRun).toISOString()}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Next Run</h3>
                    <div className="text-foreground">
                      {selectedJob.nextRun ? formatTime(selectedJob.nextRun) : 'N/A'}
                    </div>
                    {selectedJob.nextRun && (
                      <div className="text-xs text-primary mt-1">
                        {selectedJob.nextRun ? 
                          `Time left: ${Math.round((selectedJob.nextRun - Date.now()) / 1000)}s` : 
                          'No next run time set'}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Run Status</h3>
                    <div>
                      {selectedJob.lastRunStatus ? (
                        selectedJob.lastRunStatus === 'success' ? (
                          <span className="text-green-500">Success</span>
                        ) : (
                          <span className="text-destructive">Failure</span>
                        )
                      ) : 'N/A'}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Run Duration</h3>
                    <div className="text-foreground">{formatDuration(selectedJob.lastRunDuration)}</div>
                    {selectedJob.lastRunDuration && (
                      <div className="text-xs text-muted-foreground">
                        {selectedJob.lastRunDuration} ms
                      </div>
                    )}
                  </div>
                  
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                    <div className="text-sm text-foreground">{selectedJob.description || 'No description'}</div>
                  </div>
                  
                  {selectedJob.lastRunError && (
                    <div className="md:col-span-2">
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Error</h3>
                      <div className="bg-destructive/10 p-2 rounded text-xs font-mono overflow-auto max-h-[100px] text-destructive border border-destructive/20">
                        {selectedJob.lastRunError}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-foreground mb-2">Technical Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="p-2 bg-muted/30 border border-border rounded">
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">Redis Storage Key</h4>
                      <div className="font-mono text-xs text-foreground">cron:job:{selectedJob.id}</div>
                    </div>
                    <div className="p-2 bg-muted/30 border border-border rounded">
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">History Key</h4>
                      <div className="font-mono text-xs text-foreground">cron:history:{selectedJob.id}</div>
                    </div>
                    <div className="p-2 bg-muted/30 border border-border rounded md:col-span-2">
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">Executed Endpoint</h4>
                      <div className="font-mono text-xs break-all text-foreground">{process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ping</div>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-foreground mb-2">Raw JSON Data</h3>
                  <div className="bg-muted/30 p-2 rounded text-xs font-mono overflow-auto max-h-[200px] whitespace-pre-wrap text-foreground border border-border">
                    {JSON.stringify(selectedJob, null, 2)}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Execution History</h3>
                  {jobHistory.length === 0 ? (
                    <div className="text-muted-foreground text-sm py-2">No execution history available</div>
                  ) : (
                    <div className="overflow-auto max-h-[250px]">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="p-2 text-left text-muted-foreground">Time</th>
                            <th className="p-2 text-left text-muted-foreground">Status</th>
                            <th className="p-2 text-left text-muted-foreground">Duration</th>
                            <th className="p-2 text-left text-muted-foreground">Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jobHistory.map((entry, index) => (
                            <tr key={index} className="border-t border-border hover:bg-muted/30">
                              <td className="p-2">
                                <span className="text-foreground">{formatTime(entry.timestamp)}</span>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(entry.timestamp).toISOString()}
                                </div>
                              </td>
                              <td className="p-2">
                                {entry.status === 'success' ? (
                                  <span className="text-green-500">Success</span>
                                ) : (
                                  <span className="text-destructive">Failure</span>
                                )}
                              </td>
                              <td className="p-2">
                                <span className="text-foreground">{formatDuration(entry.duration)}</span>
                                {entry.duration && (
                                  <div className="text-xs text-muted-foreground">
                                    {entry.duration} ms
                                  </div>
                                )}
                              </td>
                              <td className="p-2">
                                {entry.error ? (
                                  <button 
                                    className="px-2 py-0.5 bg-destructive/10 text-destructive rounded text-xs border border-destructive/20"
                                    onClick={() => {
                                      alert(`Error: ${entry.error}`);
                                    }}
                                  >
                                    View Error
                                  </button>
                                ) : <span className="text-foreground">OK</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                
                {jobHistory.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-foreground mb-2">History Raw Data</h3>
                    <div className="bg-muted/30 p-2 rounded text-xs font-mono overflow-auto max-h-[200px] whitespace-pre-wrap text-foreground border border-border">
                      {JSON.stringify(jobHistory, null, 2)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-card p-6 rounded-lg shadow-sm border border-border text-center">
                <h2 className="text-lg font-semibold mb-2 text-foreground">Cron Job Management</h2>
                <p className="text-muted-foreground mb-4">
                  Select a job from the list to view details or create a new cron job.
                </p>
                <button 
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded"
                  onClick={() => setIsCreatingJob(true)}
                >
                  Create New Job
                </button>
                
                <div className="mt-8 text-left">
                  <h3 className="text-md font-semibold mb-2 text-foreground">Schedule Helper</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Use this tool to create and understand cron schedules for your jobs
                  </p>
                  <CronSelector 
                    value={'*/5 * * * *'}
                    onChange={(value) => {
                      // Pre-populate the new job form if user clicks "Create New Job"
                      setNewJob({...newJob, cronExpression: value});
                    }}
                    showNextRun={true}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/50 flex items-center justify-center">
          <div className="bg-card rounded-lg shadow-xl p-6 w-full max-w-xl border border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">Import Cron Jobs</h3>
              <button 
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportData('');
                  setImportError(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {importError && (
              <div className="mb-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
                {importError}
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Upload JSON File
              </label>
              <div className="flex items-center justify-center px-6 pt-5 pb-6 border-2 border-dashed border-border rounded-md bg-muted/30">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-muted-foreground" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-muted-foreground">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-background rounded-md font-medium text-primary hover:text-primary/80">
                      <span>Upload a file</span>
                      <input 
                        id="file-upload" 
                        name="file-upload" 
                        type="file" 
                        className="sr-only"
                        accept=".json"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-muted-foreground">JSON only</p>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Or Paste JSON Data
              </label>
              <textarea
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-48 font-mono text-sm text-foreground"
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste your JSON data here..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportData('');
                  setImportError(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded disabled:bg-muted disabled:text-muted-foreground"
                onClick={handleImportJobs}
                disabled={!importData.trim()}
              >
                Import Jobs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 