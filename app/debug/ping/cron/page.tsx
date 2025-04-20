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
  const { setTheme } = useTheme();

  // Force light mode using theme context
  useEffect(() => {
    // Store the original theme
    const originalTheme = localStorage.getItem("openuptimes-theme");
    
    // Force light theme
    setTheme("light");
    
    // Restore original theme on unmount
    return () => {
      if (originalTheme) {
        setTheme(originalTheme as "light" | "dark");
      }
    };
  }, [setTheme]);

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

  const handleCronExpressionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
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
    <div>
      <DebugNav />
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cron Jobs Debug</h1>
            <p className="text-sm text-gray-500 mt-1">
              Create and manage scheduled jobs
            </p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={() => setIsCreatingJob(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
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
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-3">Cron Jobs Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="text-sm text-blue-800 mb-1">Total Jobs</div>
                  <div className="text-2xl font-bold text-blue-900">{cronJobs.length}</div>
                </div>
                
                <div className="bg-green-50 p-3 rounded-md">
                  <div className="text-sm text-green-800 mb-1">Running</div>
                  <div className="text-2xl font-bold text-green-900">
                    {cronJobs.filter(job => job.status === 'running').length}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="text-sm text-gray-800 mb-1">Stopped</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {cronJobs.filter(job => job.status === 'stopped').length}
                  </div>
                </div>
                
                <div className="bg-red-50 p-3 rounded-md">
                  <div className="text-sm text-red-800 mb-1">Errors</div>
                  <div className="text-2xl font-bold text-red-900">
                    {cronJobs.filter(job => job.status === 'error' || job.lastRunStatus === 'failure').length}
                  </div>
                </div>
                
                <div className="bg-purple-50 p-3 rounded-md">
                  <div className="text-sm text-purple-800 mb-1">Next Run</div>
                  <div className="text-xl font-bold text-purple-900">
                    {(() => {
                      const nextRunJobs = cronJobs
                        .filter(job => job.nextRun && job.status === 'running')
                        .sort((a, b) => (a.nextRun || 0) - (b.nextRun || 0));
                      
                      if (nextRunJobs.length === 0) return 'None';
                      
                      const nextJob = nextRunJobs[0];
                      const timeLeft = Math.round(((nextJob.nextRun || 0) - Date.now()) / 1000);
                      
                      if (timeLeft < 0) return 'Imminent';
                      if (timeLeft < 60) return `${timeLeft}s`;
                      if (timeLeft < 3600) return `${Math.floor(timeLeft / 60)}m`;
                      return `${Math.floor(timeLeft / 3600)}h`;
                    })()}
                  </div>
                </div>
              </div>
              
              {cronJobs.length > 0 && (
                <div className="mt-4 text-xs text-gray-600">
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
                          <span className="font-mono">{mostCommon[0]}</span> : 
                          'N/A';
                      })()
                    }</div>
                    
                    <div>Oldest job: {
                      (() => {
                        if (cronJobs.length === 0) return 'N/A';
                        
                        const oldest = cronJobs.reduce((oldest, job) => 
                          job.createdAt < oldest.createdAt ? job : oldest, cronJobs[0]);
                        
                        return oldest ? 
                          <span>{oldest.name} ({formatTime(oldest.createdAt)})</span> : 
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
                          <span>{latest.name} ({formatTime(latest.lastRun || 0)})</span> : 
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
            <div className="bg-white p-4 rounded-lg shadow mb-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Cron Jobs</h2>
                <button 
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                  onClick={() => setIsCreatingJob(true)}
                >
                  New Job
                </button>
              </div>
              
              {isLoading ? (
                <div className="text-center py-4">Loading...</div>
              ) : error ? (
                <div className="text-red-500 text-center py-4">{error}</div>
              ) : cronJobs.length === 0 ? (
                <div className="text-gray-500 text-center py-4">No cron jobs found</div>
              ) : (
                <div className="overflow-auto max-h-[500px] space-y-3">
                  {cronJobs.map(job => (
                    <div 
                      key={job.id}
                      className={`border rounded-lg p-3 hover:bg-gray-50 cursor-pointer ${selectedJob?.id === job.id ? 'bg-blue-50 border-blue-200' : ''}`}
                      onClick={() => fetchJobDetails(job.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">{job.name}</div>
                          {job.description && (
                            <div className="text-xs text-gray-500 truncate max-w-full" title={job.description}>
                              {job.description}
                            </div>
                          )}
                        </div>
                        <div className={`${job.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} px-2 py-0.5 rounded text-xs font-medium`}>
                          {job.status}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-2 text-xs">
                        <div>
                          <span className="text-gray-500">Schedule:</span>
                          <div className="font-mono">
                            {job.cronExpression}
                          </div>
                          <div className="text-gray-600">
                            {describeCronExpression(job.cronExpression)}
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-gray-500">Next Run:</span>
                          <div>
                            {job.nextRun ? (
                              formatTime(job.nextRun)
                            ) : (
                              <span className="text-gray-500">N/A</span>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-gray-500">Last Run:</span>
                          <div>
                            {job.lastRun ? (
                              formatTime(job.lastRun)
                            ) : (
                              <span className="text-gray-500">Never</span>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <div>
                            {job.lastRunStatus ? (
                              job.lastRunStatus === 'success' ? (
                                <span className="text-green-600">Success</span>
                              ) : (
                                <span className="text-red-600">Failure</span>
                              )
                            ) : (
                              <span className="text-gray-500">Never run</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-1 mt-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleStopJob(job.id); }}
                          className={`text-xs px-2 py-1 rounded ${
                            job.enabled 
                              ? 'bg-red-50 hover:bg-red-100 text-red-600' 
                              : 'bg-green-50 hover:bg-green-100 text-green-600'
                          }`}
                        >
                          {job.enabled ? 'Stop' : 'Start'}
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEditJob(job); }}
                          className="text-xs px-2 py-1 rounded bg-yellow-50 hover:bg-yellow-100 text-yellow-600"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleCloneJob(job); }}
                          className="text-xs px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600"
                        >
                          Clone
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.id); }}
                          className="text-xs px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2">Debug Logs</h2>
              <div className="bg-gray-100 p-2 rounded text-xs font-mono h-[200px] overflow-auto">
                {logs.length === 0 ? (
                  <div className="text-gray-500">No logs yet</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="whitespace-pre-wrap mb-1">{log}</div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Job Details & Creation/Editing */}
          <div className="md:col-span-8">
            {isCreatingJob ? (
              <div className="bg-white p-4 rounded-lg shadow mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Create New Cron Job</h2>
                  <button 
                    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm"
                    onClick={() => setIsCreatingJob(false)}
                  >
                    Cancel
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newJob.name}
                      onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
                      placeholder="Daily ping job"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newJob.description}
                      onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                      placeholder="Job description (optional)"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cron Expression <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isCronExpressionValid ? 'border-red-500' : ''}`}
                      value={newJob.cronExpression}
                      onChange={handleCronExpressionChange}
                      placeholder="*/5 * * * *"
                    />
                    {!isCronExpressionValid && (
                      <p className="text-red-500 text-xs mt-1">Invalid cron expression format</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Format: minute hour day-of-month month day-of-week
                    </p>
                    <p className="text-xs text-gray-500">
                      Example: */5 * * * * (Every 5 minutes)
                    </p>
                    {estimatedNextRun && isCronExpressionValid && (
                      <div className="mt-2 text-xs text-green-600">
                        Estimated next run: {formatTime(estimatedNextRun)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enabled"
                      className="mr-2"
                      checked={newJob.enabled}
                      onChange={(e) => setNewJob({ ...newJob, enabled: e.target.checked })}
                    />
                    <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
                      Enable job immediately
                    </label>
                  </div>
                  
                  <div className="mt-2">
                    <button
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:bg-blue-300"
                      onClick={handleCreateJob}
                      disabled={!newJob.name || !isCronExpressionValid}
                    >
                      Create Job
                    </button>
                  </div>
                </div>
              </div>
            ) : isEditingJob && jobToEdit ? (
              <div className="bg-white p-4 rounded-lg shadow mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Edit Cron Job</h2>
                  <button 
                    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={jobToEdit.name}
                      onChange={(e) => setJobToEdit({ ...jobToEdit, name: e.target.value })}
                      placeholder="Job name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={jobToEdit.description || ''}
                      onChange={(e) => setJobToEdit({ ...jobToEdit, description: e.target.value })}
                      placeholder="Job description (optional)"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cron Expression <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        !validateCronExpression(jobToEdit.cronExpression) ? 'border-red-500' : ''
                      }`}
                      value={jobToEdit.cronExpression}
                      onChange={(e) => setJobToEdit({ ...jobToEdit, cronExpression: e.target.value })}
                      placeholder="*/5 * * * *"
                    />
                    {!validateCronExpression(jobToEdit.cronExpression) && (
                      <p className="text-red-500 text-xs mt-1">Invalid cron expression format</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Format: minute hour day-of-month month day-of-week
                    </p>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="edit-enabled"
                      className="mr-2"
                      checked={jobToEdit.enabled}
                      onChange={(e) => setJobToEdit({ ...jobToEdit, enabled: e.target.checked })}
                    />
                    <label htmlFor="edit-enabled" className="text-sm font-medium text-gray-700">
                      Enable job
                    </label>
                  </div>
                  
                  <div className="mt-2">
                    <button
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:bg-blue-300"
                      onClick={handleUpdateJob}
                      disabled={!jobToEdit.name || !validateCronExpression(jobToEdit.cronExpression)}
                    >
                      Update Job
                    </button>
                  </div>
                </div>
              </div>
            ) : selectedJob ? (
              <div className="bg-white p-4 rounded-lg shadow mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">{selectedJob.name}</h2>
                  <div className="flex gap-2">
                    {selectedJob.status === 'running' ? (
                      <button 
                        className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded text-sm"
                        onClick={() => handleStopJob(selectedJob.id)}
                      >
                        Stop Job
                      </button>
                    ) : (
                      <button 
                        className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 rounded text-sm"
                        onClick={() => handleStartJob(selectedJob.id)}
                      >
                        Start Job
                      </button>
                    )}
                    <button 
                      className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-sm"
                      onClick={() => handleDeleteJob(selectedJob.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                    <div>{formatStatus(selectedJob.status)}</div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Cron Expression</h3>
                    <div className="font-mono text-sm">{selectedJob.cronExpression}</div>
                    <div className="text-xs text-gray-500">
                      {describeCronExpression(selectedJob.cronExpression)}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">ID</h3>
                    <div className="font-mono text-xs break-all">{selectedJob.id}</div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Enabled</h3>
                    <div className={selectedJob.enabled ? "text-green-600" : "text-red-600"}>
                      {selectedJob.enabled ? "Yes" : "No"}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Created At</h3>
                    <div>{formatTime(selectedJob.createdAt)}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(selectedJob.createdAt).toISOString()}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Updated At</h3>
                    <div>{formatTime(selectedJob.updatedAt)}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(selectedJob.updatedAt).toISOString()}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Last Run</h3>
                    <div>
                      {selectedJob.lastRun ? formatTime(selectedJob.lastRun) : 'Never'}
                    </div>
                    {selectedJob.lastRun && (
                      <div className="text-xs text-gray-500">
                        {new Date(selectedJob.lastRun).toISOString()}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Next Run</h3>
                    <div>
                      {selectedJob.nextRun ? formatTime(selectedJob.nextRun) : 'N/A'}
                    </div>
                    {selectedJob.nextRun && (
                      <div className="text-xs text-gray-500">
                        {new Date(selectedJob.nextRun).toISOString()}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Last Run Status</h3>
                    <div>
                      {selectedJob.lastRunStatus ? (
                        selectedJob.lastRunStatus === 'success' ? (
                          <span className="text-green-600">Success</span>
                        ) : (
                          <span className="text-red-600">Failure</span>
                        )
                      ) : 'N/A'}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Last Run Duration</h3>
                    <div>{formatDuration(selectedJob.lastRunDuration)}</div>
                    {selectedJob.lastRunDuration && (
                      <div className="text-xs text-gray-500">
                        {selectedJob.lastRunDuration} ms
                      </div>
                    )}
                  </div>
                  
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                    <div className="text-sm">{selectedJob.description || 'No description'}</div>
                  </div>
                  
                  {selectedJob.lastRunError && (
                    <div className="md:col-span-2">
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Last Error</h3>
                      <div className="bg-red-50 p-2 rounded text-xs font-mono overflow-auto max-h-[100px]">
                        {selectedJob.lastRunError}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Technical Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="p-2 bg-gray-50 rounded">
                      <h4 className="text-xs font-medium text-gray-600 mb-1">Redis Storage Key</h4>
                      <div className="font-mono text-xs">cron:job:{selectedJob.id}</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <h4 className="text-xs font-medium text-gray-600 mb-1">History Key</h4>
                      <div className="font-mono text-xs">cron:history:{selectedJob.id}</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded md:col-span-2">
                      <h4 className="text-xs font-medium text-gray-600 mb-1">Executed Endpoint</h4>
                      <div className="font-mono text-xs break-all">{process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ping</div>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Raw JSON Data</h3>
                  <div className="bg-gray-100 p-2 rounded text-xs font-mono overflow-auto max-h-[200px] whitespace-pre-wrap">
                    {JSON.stringify(selectedJob, null, 2)}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Execution History</h3>
                  {jobHistory.length === 0 ? (
                    <div className="text-gray-500 text-sm py-2">No execution history available</div>
                  ) : (
                    <div className="overflow-auto max-h-[250px]">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="p-2 text-left">Time</th>
                            <th className="p-2 text-left">Status</th>
                            <th className="p-2 text-left">Duration</th>
                            <th className="p-2 text-left">Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jobHistory.map((entry, index) => (
                            <tr key={index} className="border-t hover:bg-gray-50">
                              <td className="p-2">
                                {formatTime(entry.timestamp)}
                                <div className="text-xs text-gray-500">
                                  {new Date(entry.timestamp).toISOString()}
                                </div>
                              </td>
                              <td className="p-2">
                                {entry.status === 'success' ? (
                                  <span className="text-green-600">Success</span>
                                ) : (
                                  <span className="text-red-600">Failure</span>
                                )}
                              </td>
                              <td className="p-2">
                                {formatDuration(entry.duration)}
                                {entry.duration && (
                                  <div className="text-xs text-gray-500">
                                    {entry.duration} ms
                                  </div>
                                )}
                              </td>
                              <td className="p-2">
                                {entry.error ? (
                                  <button 
                                    className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs"
                                    onClick={() => {
                                      alert(`Error: ${entry.error}`);
                                    }}
                                  >
                                    View Error
                                  </button>
                                ) : 'OK'}
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
                    <h3 className="text-sm font-medium text-gray-700 mb-2">History Raw Data</h3>
                    <div className="bg-gray-100 p-2 rounded text-xs font-mono overflow-auto max-h-[200px] whitespace-pre-wrap">
                      {JSON.stringify(jobHistory, null, 2)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <h2 className="text-lg font-semibold mb-2">Cron Job Management</h2>
                <p className="text-gray-600 mb-4">
                  Select a job from the list to view details or create a new cron job.
                </p>
                <button 
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
                  onClick={() => setIsCreatingJob(true)}
                >
                  Create New Job
                </button>
              </div>
            )}

            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2">About Cron Jobs</h2>
              <div className="space-y-2 text-sm">
                <p>
                  Cron jobs allow you to schedule regular ping checks for your website.
                </p>
                <p>
                  <strong>Cron Expression Format:</strong> minute hour day-of-month month day-of-week
                </p>
                <p>
                  Common examples:
                </p>
                <ul className="list-disc list-inside pl-2">
                  <li><code className="font-mono bg-gray-100 px-1">* * * * *</code> - Every minute</li>
                  <li><code className="font-mono bg-gray-100 px-1">*/5 * * * *</code> - Every 5 minutes</li>
                  <li><code className="font-mono bg-gray-100 px-1">0 */1 * * *</code> - Every hour</li>
                  <li><code className="font-mono bg-gray-100 px-1">0 0 * * *</code> - Once a day at midnight</li>
                  <li><code className="font-mono bg-gray-100 px-1">0 0 * * 0</code> - Once a week on Sunday</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 