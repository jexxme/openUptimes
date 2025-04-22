"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Calendar, Clock, AlertCircle, Info, Plus, RefreshCw, 
  Download, Upload, CheckCircle, XCircle, Play, Square,
  Edit, Copy, Trash, ExternalLink, ChevronDown, ChevronUp,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import CronSelector from "@/app/components/CronSelector";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from 'date-fns';
import { Badge } from "@/components/ui/badge";

// Types for the component
interface CronJob {
  id: string;
  name: string;
  description: string;
  cronExpression: string;
  enabled: boolean;
  status: string;
  createdAt: number;
  updatedAt: number;
  lastRun?: number;
  nextRun?: number;
  lastRunStatus?: string;
  lastRunDuration?: number;
  lastRunError?: string;
}

interface HistoryEntry {
  timestamp: number;
  status: string;
  duration?: number;
  error?: string;
}

interface CronJobPageProps {
  setActiveTab?: (tab: string) => void;
  registerUnsavedChangesCallback?: (key: string, callback: () => boolean) => void;
  preloadedData?: any;
}

// Format a timestamp to human-readable text
const formatTime = (timestamp: number): string => {
  if (!timestamp) return 'N/A';
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
};

// Format duration (in milliseconds) to human-readable text
const formatDuration = (ms?: number): string => {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms/1000).toFixed(2)}s`;
};

// Format cron expression to human-readable text
const describeCronExpression = (expression: string): string => {
  // Simple descriptions for common patterns
  if (expression === '* * * * *') return 'Every minute';
  if (expression === '*/5 * * * *') return 'Every 5 minutes';
  if (expression === '*/15 * * * *') return 'Every 15 minutes';
  if (expression === '*/30 * * * *') return 'Every 30 minutes';
  if (expression === '0 * * * *') return 'Every hour';
  if (expression === '0 */6 * * *') return 'Every 6 hours';
  if (expression === '0 0 * * *') return 'Daily at midnight';
  if (expression === '0 12 * * *') return 'Daily at noon';
  
  // Return the expression itself for custom patterns
  return expression;
};

export function CronJobPage({ 
  setActiveTab, 
  registerUnsavedChangesCallback, 
  preloadedData 
}: CronJobPageProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Environment detection
  const [isEdgeRuntime, setIsEdgeRuntime] = useState(false);
  
  // Cron jobs data
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<CronJob | null>(null);
  const [jobHistory, setJobHistory] = useState<HistoryEntry[]>([]);
  
  // UI state
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [isEditingJob, setIsEditingJob] = useState(false);
  const [newJob, setNewJob] = useState({
    name: '',
    description: '',
    cronExpression: '*/5 * * * *',
    enabled: true
  });
  const [jobToEdit, setJobToEdit] = useState<CronJob | null>(null);
  
  // Import/Export state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  
  // Stats calculations
  const upServices = cronJobs.filter(job => job.status === 'running').length;
  const downServices = cronJobs.filter(job => job.status === 'stopped').length;
  const errorServices = cronJobs.filter(job => job.status === 'error' || job.lastRunStatus === 'failure').length;

  // Detect if running on Vercel Edge runtime
  useEffect(() => {
    const checkEnvironment = async () => {
      try {
        const response = await fetch('/api/environment');
        if (response.ok) {
          const data = await response.json();
          setIsEdgeRuntime(data.isEdgeRuntime || (process.env.NEXT_RUNTIME === 'edge'));
        }
      } catch (err) {
        // Fallback detection method
        setIsEdgeRuntime(typeof process !== 'undefined' && process.env && process.env.NEXT_RUNTIME === 'edge');
      }
    };
    
    checkEnvironment();
  }, []);

  // Initialize data when component mounts
  useEffect(() => {
    fetchCronJobs();
  }, []);
  
  // Fetch cron jobs from API
  const fetchCronJobs = async () => {
    try {
      setIsLoading(true);
      
      // API call to fetch cron jobs
      const response = await fetch('/api/ping/cron');
      if (!response.ok) {
        throw new Error(`Error fetching cron jobs: ${response.statusText}`);
      }
      
      const data = await response.json();
      setCronJobs(data);
      
      // Auto-select the first job if there's at least one and none selected
      if (data.length > 0 && !selectedJob) {
        fetchJobDetails(data[0].id);
      }
      
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      toast({
        title: "Error loading cron jobs",
        description: (err as Error).message,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch job details
  const fetchJobDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/ping/cron?id=${id}`);
      if (!response.ok) {
        throw new Error(`Error fetching job details: ${response.statusText}`);
      }
      
      const job = await response.json();
      setSelectedJob(job);
      
      // Also fetch job history
      fetchJobHistory(id);
    } catch (err) {
      toast({
        title: "Error loading job details",
        description: (err as Error).message,
        variant: "destructive",
        duration: 5000,
      });
    }
  };
  
  // Fetch job history
  const fetchJobHistory = async (id: string) => {
    try {
      const response = await fetch(`/api/ping/cron?id=${id}&history=true`);
      if (!response.ok) {
        throw new Error(`Error fetching job history: ${response.statusText}`);
      }
      
      const data = await response.json();
      setJobHistory(data.history || []);
    } catch (err) {
      toast({
        title: "Error loading job history",
        description: (err as Error).message,
        variant: "destructive",
        duration: 3000,
      });
    }
  };
  
  // Create a new job
  const handleCreateJob = async () => {
    try {
      const response = await fetch('/api/ping/cron', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newJob),
      });
      
      if (!response.ok) {
        throw new Error(`Error creating job: ${response.statusText}`);
      }
      
      const job = await response.json();
      
      toast({
        title: "Job created successfully",
        variant: "success",
        duration: 3000,
      });
      
      // Reset form and refresh job list
      setNewJob({
        name: '',
        description: '',
        cronExpression: '*/5 * * * *',
        enabled: true
      });
      setIsCreatingJob(false);
      fetchCronJobs();
    } catch (err) {
      toast({
        title: "Error creating job",
        description: (err as Error).message,
        variant: "destructive",
        duration: 5000,
      });
    }
  };
  
  // Update existing job
  const handleUpdateJob = async () => {
    if (!jobToEdit) return;
    
    try {
      const response = await fetch(`/api/ping/cron`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: jobToEdit.id,
          name: jobToEdit.name,
          description: jobToEdit.description,
          cronExpression: jobToEdit.cronExpression,
          enabled: jobToEdit.enabled
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error updating job: ${response.statusText}`);
      }
      
      const updatedJob = await response.json();
      
      toast({
        title: "Job updated successfully",
        variant: "success",
        duration: 3000,
      });
      
      // Reset form and refresh data
      setIsEditingJob(false);
      setJobToEdit(null);
      fetchCronJobs();
      
      // If this was the selected job, update it
      if (selectedJob?.id === updatedJob.id) {
        setSelectedJob(updatedJob);
      }
    } catch (err) {
      toast({
        title: "Error updating job",
        description: (err as Error).message,
        variant: "destructive",
        duration: 5000,
      });
    }
  };
  
  // Start a job
  const handleStartJob = async (id: string) => {
    try {
      const response = await fetch(`/api/ping/cron`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          action: 'start'
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error starting job: ${response.statusText}`);
      }
      
      toast({
        title: "Job started successfully",
        variant: "success",
        duration: 3000,
      });
      
      // Refresh job list and selected job
      fetchCronJobs();
      if (selectedJob?.id === id) {
        fetchJobDetails(id);
      }
    } catch (err) {
      toast({
        title: "Error starting job",
        description: (err as Error).message,
        variant: "destructive",
        duration: 5000,
      });
    }
  };
  
  // Stop a job
  const handleStopJob = async (id: string) => {
    try {
      const response = await fetch(`/api/ping/cron`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          action: 'stop'
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error stopping job: ${response.statusText}`);
      }
      
      toast({
        title: "Job stopped successfully",
        variant: "success",
        duration: 3000,
      });
      
      // Refresh job list and selected job
      fetchCronJobs();
      if (selectedJob?.id === id) {
        fetchJobDetails(id);
      }
    } catch (err) {
      toast({
        title: "Error stopping job",
        description: (err as Error).message,
        variant: "destructive",
        duration: 5000,
      });
    }
  };
  
  // Delete a job
  const handleDeleteJob = async (id: string) => {
    try {
      const response = await fetch(`/api/ping/cron?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Error deleting job: ${response.statusText}`);
      }
      
      toast({
        title: "Job deleted successfully",
        variant: "success",
        duration: 3000,
      });
      
      // Clear selected job if it was the one deleted
      if (selectedJob?.id === id) {
        setSelectedJob(null);
        setJobHistory([]);
      }
      
      fetchCronJobs();
    } catch (err) {
      toast({
        title: "Error deleting job",
        description: (err as Error).message,
        variant: "destructive",
        duration: 5000,
      });
    }
  };
  
  // Prepare for editing a job
  const handleEditJob = (job: CronJob) => {
    setJobToEdit({...job});
    setIsEditingJob(true);
  };
  
  // Clone an existing job
  const handleCloneJob = (job: CronJob) => {
    setNewJob({
      name: `${job.name} (Clone)`,
      description: job.description || '',
      cronExpression: job.cronExpression,
      enabled: false // Set to disabled by default for safety
    });
    setIsCreatingJob(true);
  };
  
  // Export jobs as JSON
  const handleExportJobs = () => {
    try {
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
      
      toast({
        title: "Jobs exported successfully",
        variant: "success",
        duration: 3000,
      });
    } catch (err) {
      toast({
        title: "Error exporting jobs",
        description: (err as Error).message,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 mb-6 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-2 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      
      {/* Vercel Edge Runtime Warning */}
      {isEdgeRuntime && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30 rounded-md">
          <div className="flex items-start">
            <Shield className="h-5 w-5 text-amber-500 dark:text-amber-400 mr-3 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800 dark:text-amber-300 flex items-center">
                <span>Edge Runtime Detected</span>
                <Badge variant="warning" className="ml-2 text-[10px] h-5 bg-amber-100 hover:bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                  Vercel Edge
                </Badge>
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Cron jobs may not function properly in Edge Runtime. For reliable scheduling, consider:
              </p>
              <ul className="list-disc list-inside text-xs text-amber-700 dark:text-amber-400 mt-2 space-y-1">
                <li>Setting up manual HTTP pings to your endpoints</li>
                <li>Using GitHub Actions for scheduled tasks (only recommended in low activity environments)</li>
                <li>Deploying to Node.js runtime instead of Edge</li>
              </ul>
              <div className="mt-3">
                <Link href="https://vercel.com/docs/cron-jobs" target="_blank" className="text-xs text-amber-700 dark:text-amber-400 underline hover:text-amber-900 flex items-center">
                  Learn more about Vercel cron limitations
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Import Dialog */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Cron Jobs</DialogTitle>
            <DialogDescription>
              Import cron jobs from a JSON file or paste JSON data directly.
            </DialogDescription>
          </DialogHeader>
          
          {importError && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 p-3 rounded-md text-sm text-red-600 dark:text-red-400">
              {importError}
            </div>
          )}
          
          <div className="grid gap-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Paste JSON Data
              </label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                placeholder='{"version":"1.0","jobs":[{"name":"Job Name","cronExpression":"*/5 * * * *"}]}'
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                The JSON should include a "jobs" array with job objects containing name, cronExpression, and optionally description and enabled properties.
              </p>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <Button variant="outline" size="sm" className="text-sm" onClick={() => {
                // Create a file input element and trigger click
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (event.target?.result) {
                        setImportData(event.target.result as string);
                      }
                    };
                    reader.readAsText(file);
                  }
                };
                input.click();
              }}>
                <Upload className="h-4 w-4 mr-2" />
                Upload JSON File
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsImportModalOpen(false);
              setImportData('');
              setImportError(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!importData.trim()) {
                  setImportError('Please enter or upload JSON data');
                  return;
                }
                
                try {
                  // Parse the JSON data
                  let parsedData;
                  try {
                    parsedData = JSON.parse(importData);
                  } catch (err) {
                    setImportError('Invalid JSON format');
                    return;
                  }
                  
                  // Validate the data structure
                  if (!parsedData.jobs || !Array.isArray(parsedData.jobs)) {
                    setImportError('Invalid import format: missing or invalid jobs array');
                    return;
                  }
                  
                  // Perform the import
                  const response = await fetch('/api/ping/cron', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(parsedData),
                  });
                  
                  if (!response.ok) {
                    throw new Error(`Error importing jobs: ${response.statusText}`);
                  }
                  
                  const result = await response.json();
                  
                  toast({
                    title: "Jobs imported successfully",
                    description: `${result.success} out of ${result.total} jobs imported`,
                    variant: "success",
                    duration: 3000,
                  });
                  
                  // Reset form and refresh jobs list
                  setIsImportModalOpen(false);
                  setImportData('');
                  setImportError(null);
                  fetchCronJobs();
                } catch (err) {
                  setImportError((err as Error).message);
                }
              }}
              disabled={!importData.trim()}
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="rounded-lg border bg-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Cron Jobs</span>
            {isEdgeRuntime && (
              <Badge variant="outline" className="ml-2 text-[10px] h-5 border-amber-500 text-amber-600 dark:text-amber-400">
                Edge Runtime
              </Badge>
            )}
          </h3>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCronJobs}
              className="h-8"
              title="Refresh Jobs"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJobs}
              className="h-8"
              title="Export Jobs"
              disabled={cronJobs.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              className="h-8"
              title="Import Jobs"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsCreatingJob(true)}
              className="h-8"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Button>
          </div>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure and manage scheduled tasks that run at specific intervals.
          </p>
          
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : cronJobs.length === 0 ? (
            <div className="py-12 flex justify-center items-center">
              <div className="flex flex-col items-center text-center max-w-md">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Cron Jobs Configured</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You don't have any scheduled tasks set up yet. Create your first cron job to automate recurring tasks.
                  {isEdgeRuntime && (
                    <span className="block mt-2 text-amber-600 dark:text-amber-400">
                      Note: Cron jobs have limited functionality in Edge Runtime environments.
                    </span>
                  )}
                </p>
                <Button 
                  onClick={() => setIsCreatingJob(true)}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Job
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {/* Stats overview */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="flex flex-col rounded-md border p-4 transition-colors text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded-full bg-white/90 dark:bg-gray-900/80">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-medium dark:text-gray-200">Total Jobs</h3>
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className="text-xl font-bold dark:text-white">{cronJobs.length}</span>
                    <div className="text-xs mt-1 leading-tight opacity-80 dark:text-gray-400">
                      {upServices} running, {downServices} stopped
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col rounded-md border p-4 transition-colors text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded-full bg-white/90 dark:bg-gray-900/80">
                        <Play className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-medium dark:text-gray-200">Running</h3>
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className="text-xl font-bold dark:text-white">{upServices}</span>
                    <div className="text-xs mt-1 leading-tight opacity-80 dark:text-gray-400">
                      Active scheduled jobs
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col rounded-md border p-4 transition-colors text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-900/50 bg-gray-50 dark:bg-gray-950/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded-full bg-white/90 dark:bg-gray-900/80">
                        <Square className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-medium dark:text-gray-200">Stopped</h3>
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className="text-xl font-bold dark:text-white">{downServices}</span>
                    <div className="text-xs mt-1 leading-tight opacity-80 dark:text-gray-400">
                      Inactive jobs
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col rounded-md border p-4 transition-colors text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded-full bg-white/90 dark:bg-gray-900/80">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-medium dark:text-gray-200">Errors</h3>
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className="text-xl font-bold dark:text-white">{errorServices}</span>
                    <div className="text-xs mt-1 leading-tight opacity-80 dark:text-gray-400">
                      Jobs with errors
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Job List and Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Job List - Left Column */}
                <div className="md:col-span-4 space-y-4">
                  {/* Job List Panel */}
                  <div className="border rounded-lg p-4 bg-card">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-medium">Job List</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCreatingJob(true)}
                        className="h-8 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        New
                      </Button>
                    </div>
                    
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {cronJobs.map(job => (
                        <div 
                          key={job.id}
                          className={cn(
                            "border rounded-lg p-3 cursor-pointer transition-colors",
                            selectedJob?.id === job.id 
                              ? "bg-accent/50 border-accent/70"
                              : "hover:bg-accent/30 border-border"
                          )}
                          onClick={() => fetchJobDetails(job.id)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="truncate mr-2">
                              <p className="font-medium text-sm">{job.name}</p>
                              {job.description && (
                                <p className="text-xs text-muted-foreground truncate" 
                                   title={job.description}>
                                  {job.description}
                                </p>
                              )}
                            </div>
                            <div className={cn(
                              "text-xs font-medium px-2 py-0.5 rounded-full",
                              job.status === 'running'
                                ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                                : job.status === 'error'
                                  ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                            )}>
                              {job.status === 'running' ? 'Running' : 
                               job.status === 'stopped' ? 'Stopped' : 'Error'}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-1 gap-y-1 mb-3 text-xs">
                            <div>
                              <span className="text-muted-foreground">Schedule:</span>
                              <div className="font-mono">
                                {job.cronExpression}
                              </div>
                            </div>
                            
                            <div>
                              <span className="text-muted-foreground">Next Run:</span>
                              <div>
                                {job.nextRun ? (
                                  formatTime(job.nextRun)
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className={cn(
                                "h-6 text-xs px-2",
                                job.status === 'running'
                                  ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                  : "text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                job.status === 'running' ? handleStopJob(job.id) : handleStartJob(job.id);
                              }}
                            >
                              {job.status === 'running' ? 'Stop' : 'Start'}
                            </Button>
                            
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-xs px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditJob(job);
                              }}
                            >
                              Edit
                            </Button>
                            
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-xs px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCloneJob(job);
                              }}
                            >
                              Clone
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Job Details - Right Column */}
                <div className="md:col-span-8">
                  {isCreatingJob ? (
                    <div className="border rounded-lg p-4 bg-card">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-medium">Create New Cron Job</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsCreatingJob(false)}
                          className="h-8 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium block mb-1">
                            Name <span className="text-red-500">*</span>
                          </label>
                          <Input
                            value={newJob.name}
                            onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
                            placeholder="Daily database backup"
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium block mb-1">
                            Description
                          </label>
                          <Input
                            value={newJob.description}
                            onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                            placeholder="Runs a daily backup of the database"
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium block mb-1">
                            Schedule <span className="text-red-500">*</span>
                          </label>
                          <CronSelector
                            value={newJob.cronExpression}
                            onChange={(value) => setNewJob({ ...newJob, cronExpression: value })}
                            compact={true}
                          />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="job-enabled"
                            checked={newJob.enabled}
                            onChange={(e) => setNewJob({ ...newJob, enabled: e.target.checked })}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <label htmlFor="job-enabled" className="text-sm">
                            Enable job immediately
                          </label>
                        </div>
                        
                        {isEdgeRuntime && (
                          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30 rounded-md p-3 text-xs text-amber-700 dark:text-amber-400">
                            <div className="flex">
                              <Shield className="h-4 w-4 text-amber-500 dark:text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
                              <span>
                                <strong>Edge Runtime Notice:</strong> Cron jobs created on Vercel Edge runtime may not execute reliably. Consider using GitHub Actions or another external scheduler.
                              </span>
                            </div>
                          </div>
                        )}
                        
                        <div className="pt-2">
                          <Button 
                            onClick={handleCreateJob}
                            disabled={!newJob.name || !newJob.cronExpression}
                          >
                            Create Job
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : isEditingJob && jobToEdit ? (
                    <div className="border rounded-lg p-4 bg-card">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-medium">Edit Cron Job</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditingJob(false);
                            setJobToEdit(null);
                          }}
                          className="h-8 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium block mb-1">
                            Name <span className="text-red-500">*</span>
                          </label>
                          <Input
                            value={jobToEdit.name}
                            onChange={(e) => setJobToEdit({ ...jobToEdit, name: e.target.value })}
                            placeholder="Daily database backup"
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium block mb-1">
                            Description
                          </label>
                          <Input
                            value={jobToEdit.description || ''}
                            onChange={(e) => setJobToEdit({ ...jobToEdit, description: e.target.value })}
                            placeholder="Runs a daily backup of the database"
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium block mb-1">
                            Schedule <span className="text-red-500">*</span>
                          </label>
                          <CronSelector
                            value={jobToEdit.cronExpression}
                            onChange={(value) => setJobToEdit({ ...jobToEdit, cronExpression: value })}
                            compact={true}
                          />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="job-edit-enabled"
                            checked={jobToEdit.enabled}
                            onChange={(e) => setJobToEdit({ ...jobToEdit, enabled: e.target.checked })}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <label htmlFor="job-edit-enabled" className="text-sm">
                            Enable job
                          </label>
                        </div>
                        
                        {isEdgeRuntime && (
                          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30 rounded-md p-3 text-xs text-amber-700 dark:text-amber-400">
                            <div className="flex">
                              <Shield className="h-4 w-4 text-amber-500 dark:text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
                              <span>
                                <strong>Edge Runtime Notice:</strong> Cron jobs in Vercel Edge runtime may not execute reliably. Consider using GitHub Actions or another external scheduler.
                              </span>
                            </div>
                          </div>
                        )}
                        
                        <div className="pt-2">
                          <Button 
                            onClick={handleUpdateJob}
                            disabled={!jobToEdit.name || !jobToEdit.cronExpression}
                          >
                            Update Job
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : selectedJob ? (
                    <div className="border rounded-lg p-4 bg-card">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-medium">{selectedJob.name}</h3>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditJob(selectedJob)}
                            className="h-8"
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          
                          <Button
                            variant={selectedJob.status === 'running' ? 'destructive' : 'outline'}
                            size="sm"
                            onClick={() => selectedJob.status === 'running' 
                              ? handleStopJob(selectedJob.id) 
                              : handleStartJob(selectedJob.id)
                            }
                            className="h-8"
                          >
                            {selectedJob.status === 'running' ? (
                              <>
                                <Square className="h-3.5 w-3.5 mr-1" />
                                Stop
                              </>
                            ) : (
                              <>
                                <Play className="h-3.5 w-3.5 mr-1" />
                                Start
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Status</p>
                          <div className={cn(
                            "inline-flex items-center text-sm px-2 py-1 rounded-md",
                            selectedJob.status === 'running'
                              ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                              : selectedJob.status === 'error'
                                ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                          )}>
                            {selectedJob.status === 'running' ? 'Running' : 
                             selectedJob.status === 'stopped' ? 'Stopped' : 'Error'}
                          </div>
                          {isEdgeRuntime && selectedJob.status === 'running' && (
                            <div className="mt-1">
                              <Badge variant="warning" className="text-[10px]">
                                <Shield className="h-3 w-3 mr-1" />
                                Edge Runtime
                              </Badge>
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Schedule</p>
                          <div className="font-mono text-sm">{selectedJob.cronExpression}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {describeCronExpression(selectedJob.cronExpression)}
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">ID</p>
                          <div className="font-mono text-xs truncate">{selectedJob.id}</div>
                        </div>
                        
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Enabled</p>
                          <div className={selectedJob.enabled 
                            ? "text-green-600 dark:text-green-400" 
                            : "text-red-600 dark:text-red-400"
                          }>
                            {selectedJob.enabled ? "Yes" : "No"}
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Last Run</p>
                          <div>{selectedJob.lastRun ? formatTime(selectedJob.lastRun) : 'Never'}</div>
                        </div>
                        
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Next Run</p>
                          <div>
                            {selectedJob.nextRun && selectedJob.status === 'running'
                              ? formatTime(selectedJob.nextRun)
                              : '—'
                            }
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Created</p>
                          <div>{formatTime(selectedJob.createdAt)}</div>
                        </div>
                        
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Last Run Status</p>
                          <div>
                            {selectedJob.lastRunStatus ? (
                              selectedJob.lastRunStatus === 'success' ? (
                                <span className="text-green-600 dark:text-green-400 flex items-center">
                                  <CheckCircle className="h-3.5 w-3.5 mr-1 inline" /> Success
                                </span>
                              ) : (
                                <span className="text-red-600 dark:text-red-400 flex items-center">
                                  <XCircle className="h-3.5 w-3.5 mr-1 inline" /> Failure
                                </span>
                              )
                            ) : '—'}
                          </div>
                        </div>
                      </div>
                      
                      {selectedJob.description && (
                        <div className="mb-4">
                          <p className="text-xs text-muted-foreground mb-1">Description</p>
                          <p className="text-sm">{selectedJob.description}</p>
                        </div>
                      )}
                      
                      {selectedJob.lastRunError && (
                        <div className="mb-4">
                          <p className="text-xs text-muted-foreground mb-1">Last Error</p>
                          <div className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 p-2 rounded-md text-xs font-mono max-h-[100px] overflow-auto border border-red-200 dark:border-red-900/20">
                            {selectedJob.lastRunError}
                          </div>
                        </div>
                      )}
                      
                      {/* Job History Section */}
                      <div className="mt-8">
                        <h3 className="text-sm font-medium mb-3">Execution History</h3>
                        
                        {jobHistory.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">
                            No execution history available
                          </div>
                        ) : (
                          <div className="overflow-auto rounded-md border">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Time</th>
                                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Duration</th>
                                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Details</th>
                                </tr>
                              </thead>
                              <tbody>
                                {jobHistory.map((entry, index) => (
                                  <tr key={index} className="border-t border-border">
                                    <td className="px-4 py-2">{formatTime(entry.timestamp)}</td>
                                    <td className="px-4 py-2">
                                      {entry.status === 'success' ? (
                                        <span className="text-green-600 dark:text-green-400">Success</span>
                                      ) : (
                                        <span className="text-red-600 dark:text-red-400">Failure</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2">{formatDuration(entry.duration)}</td>
                                    <td className="px-4 py-2">
                                      {entry.error ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                                          onClick={() => {
                                            toast({
                                              title: "Error Details",
                                              description: entry.error,
                                              variant: "destructive",
                                              duration: 5000,
                                            });
                                          }}
                                        >
                                          View Error
                                        </Button>
                                      ) : 'OK'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-8 flex justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCloneJob(selectedJob)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Clone
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this job?')) {
                              handleDeleteJob(selectedJob.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-6 bg-card h-full flex flex-col justify-center items-center text-center">
                      <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Cron Job Manager</h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-md">
                        Select a job from the list to view details or create a new cron job to schedule automated tasks.
                      </p>
                      <Button onClick={() => setIsCreatingJob(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Job
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Advanced settings section */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium mb-1">Need more advanced cron job configuration?</h3>
            <p className="text-xs text-muted-foreground">
              Access the detailed debug page for more control over cron jobs, including advanced job functionality and logs.
              {isEdgeRuntime && (
                <span className="block mt-1 text-amber-600 dark:text-amber-400">
                  For Vercel Edge Runtime environments, consider <a href="https://vercel.com/docs/cron-jobs" target="_blank" className="underline hover:text-amber-800">Vercel Cron Jobs</a> or <a href="https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule" target="_blank" className="underline hover:text-amber-800">GitHub Actions</a> for reliable scheduling.
                </span>
              )}
            </p>
          </div>
          <Link href="/debug/ping/cron" className="ml-4">
            <Button variant="outline" size="sm" className="h-8 whitespace-nowrap">
              <ExternalLink className="h-4 w-4 mr-2" />
              Advanced Settings
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 