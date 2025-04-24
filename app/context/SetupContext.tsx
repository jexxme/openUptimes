import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SetupPath } from '@/components/setup/SetupPathSelector';

interface GithubSettings {
  repository: string;
  schedule: string;
  workflow: string;
  secretName: string;
  apiKey: string | null;
}

interface CronJob {
  name: string;
  description: string;
  cronExpression: string;
  enabled: boolean;
}

interface CronSettings {
  jobs: CronJob[];
}

interface CustomSettings {
  apiKey: string | null;
}

// Define the shape of our context
export interface SetupContextType {
  path: 'github' | 'cron' | 'custom' | null;
  step: number;
  isEdgeRuntime: boolean;
  password: string;
  confirmPassword: string;
  siteName: string;
  siteDescription: string;
  refreshInterval: number;
  githubSettings: GithubSettings;
  cronSettings: CronSettings;
  customSettings: CustomSettings;
  stepCompletion: Record<string, boolean>;
  setPath: (path: SetupContextType['path']) => void;
  setStep: (step: number) => void;
  updatePassword: (password: string) => void;
  updateConfirmPassword: (password: string) => void;
  updateSiteSettings: (settings: Partial<Pick<SetupContextType, 'siteName' | 'siteDescription' | 'refreshInterval'>>) => void;
  updateGithubSettings: (settings: Partial<GithubSettings>) => void;
  updateCronSettings: (settings: Partial<CronSettings>) => void;
  updateCustomSettings: (settings: Partial<CustomSettings>) => void;
  markStepComplete: (step: string) => void;
  checkEnvironment: () => Promise<void>;
  completeSetup: () => Promise<boolean>;
}

// Create the context with a default undefined value
const SetupContext = createContext<SetupContextType | undefined>(undefined);

// Default values for our state
const defaultGithubSettings: GithubSettings = {
  repository: '',
  schedule: '*/5 * * * *', // Every 5 minutes
  workflow: 'ping.yml',
  secretName: 'PING_API_KEY',
  apiKey: null,
};

const defaultCronSettings: CronSettings = {
  jobs: [],
};

const defaultCustomSettings: CustomSettings = {
  apiKey: null,
};

// Provider component
interface SetupProviderProps {
  children: ReactNode;
}

export function SetupProvider({ children }: SetupProviderProps) {
  const [path, setPath] = useState<SetupContextType['path']>(null);
  const [step, setStep] = useState(1);
  const [isEdgeRuntime, setIsEdgeRuntime] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [siteName, setSiteName] = useState(process.env.NEXT_PUBLIC_SITE_NAME || 'OpenUptimes');
  const [siteDescription, setSiteDescription] = useState(process.env.NEXT_PUBLIC_SITE_DESCRIPTION || 'Service Status Monitor');
  const [refreshInterval, setRefreshInterval] = useState(
    process.env.NEXT_PUBLIC_REFRESH_INTERVAL ? 
    parseInt(process.env.NEXT_PUBLIC_REFRESH_INTERVAL) / 1000 : 60
  );
  const [githubSettings, setGithubSettings] = useState<GithubSettings>(defaultGithubSettings);
  const [cronSettings, setCronSettings] = useState<CronSettings>(defaultCronSettings);
  const [customSettings, setCustomSettings] = useState<CustomSettings>(defaultCustomSettings);
  const [stepCompletion, setStepCompletion] = useState<Record<string, boolean>>({});

  const updatePassword = (newPassword: string) => setPassword(newPassword);
  const updateConfirmPassword = (newConfirmPassword: string) => setConfirmPassword(newConfirmPassword);
  
  const updateSiteSettings = (settings: Partial<Pick<SetupContextType, 'siteName' | 'siteDescription' | 'refreshInterval'>>) => {
    if (settings.siteName !== undefined) setSiteName(settings.siteName);
    if (settings.siteDescription !== undefined) setSiteDescription(settings.siteDescription);
    if (settings.refreshInterval !== undefined) setRefreshInterval(settings.refreshInterval);
  };
  
  const updateGithubSettings = (settings: Partial<GithubSettings>) => {
    setGithubSettings(prev => ({ ...prev, ...settings }));
  };
  
  const updateCronSettings = (settings: Partial<CronSettings>) => {
    setCronSettings(prev => ({ ...prev, ...settings }));
  };
  
  const updateCustomSettings = (settings: Partial<CustomSettings>) => {
    setCustomSettings(prev => ({ ...prev, ...settings }));
  };
  
  const markStepComplete = (stepKey: string) => {
    setStepCompletion(prev => ({ ...prev, [stepKey]: true }));
  };
  
  const checkEnvironment = async () => {
    try {
      // Add a timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('/api/environment', { 
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('Environment check failed');
      
      const data = await response.json();
      setIsEdgeRuntime(data.isEdgeRuntime);
      return data.isEdgeRuntime;
    } catch (error) {
      console.error('Error checking environment:', error);
      // Don't throw - set a default value instead
      setIsEdgeRuntime(false);
      return false;
    }
  };

  const completeSetup = async (): Promise<boolean> => {
    try {
      // Define the type for our siteSettings with pathSettings
      interface SiteSettings {
        siteName: string;
        siteDescription: string;
        refreshInterval: number;
        setupPath: 'github' | 'cron' | 'custom' | null;
        pathSettings?: GithubSettings | CronSettings | CustomSettings;
      }
      
      // Prepare the setup data based on the selected path
      const setupData: {
        password: string;
        siteSettings: SiteSettings;
      } = {
        password,
        siteSettings: {
          siteName,
          siteDescription,
          refreshInterval: refreshInterval * 1000, // Convert to milliseconds
          setupPath: path,
        }
      };
      
      // Add path-specific settings if applicable
      if (path === 'github') {
        setupData.siteSettings.pathSettings = githubSettings;
      } else if (path === 'cron') {
        setupData.siteSettings.pathSettings = cronSettings;
      } else if (path === 'custom') {
        setupData.siteSettings.pathSettings = customSettings;
      }
      
      // Call the API to complete setup
      const response = await fetch('/api/setup/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(setupData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to complete setup');
      }
      
      return true;
    } catch (error) {
      console.error('Error completing setup:', error);
      return false;
    }
  };

  // Check environment on initial load
  useEffect(() => {
    checkEnvironment();
  }, []);

  // Create the value object
  const value: SetupContextType = {
    path,
    step,
    isEdgeRuntime,
    password,
    confirmPassword,
    siteName,
    siteDescription,
    refreshInterval,
    githubSettings,
    cronSettings,
    customSettings,
    stepCompletion,
    setPath,
    setStep,
    updatePassword,
    updateConfirmPassword,
    updateSiteSettings,
    updateGithubSettings,
    updateCronSettings,
    updateCustomSettings,
    markStepComplete,
    checkEnvironment,
    completeSetup,
  };

  return <SetupContext.Provider value={value}>{children}</SetupContext.Provider>;
}

// Custom hook to use the setup context
export function useSetup() {
  const context = useContext(SetupContext);
  if (context === undefined) {
    throw new Error('useSetup must be used within a SetupProvider');
  }
  return context;
} 