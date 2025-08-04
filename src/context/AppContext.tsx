import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';

// Define the shape of a single conversion report
export interface Report {
  id: number;
  timestamp: Date;
  success: boolean;
  executionTime: number; // in milliseconds
  originalCode: string;
  convertedCode: string;
  explanation: string;
  securityIssues: SecurityIssue[];
}

// Define the shape of a security issue
export interface SecurityIssue {
  id: string;
  file: string;
  line: number;
  severity: 'high' | 'medium' | 'low';
  standard: 'HIPAA' | 'ISO27001' | 'General';
  title: string;
  description: string;
  recommendation: string;
  code: string;
}

// Define the API connectivity state
export interface ApiConnectivity {
  isConnected: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  error: string | null;
  openaiConfigured: boolean;
  userConfigured: boolean; // Track if user has explicitly configured the API through Settings
}

export interface GitConnectivity {
  isConnected: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  error: string | null;
  githubConfigured: boolean;
  userConfigured: boolean; // Track if user has explicitly configured the API through Settings
}

// Define the workspace state
export interface WorkspaceState {
  uploadedFiles: Record<string, string>;
  convertedFiles: Record<string, string>;
  selectedFileName: string;
  githubFiles: Record<string, string> | null;
  githubDefaultFile: string;
}

// Define the shape of the context state
interface AppContextType {
  reports: Report[];
  addReport: (report: Omit<Report, 'id' | 'timestamp'>) => void;
  latestReport: Report | null;
  
  // API connectivity management
  apiConnectivity: ApiConnectivity;
  checkApiConnectivity: () => Promise<void>;
  saveApiKey: (apiKey: string) => Promise<boolean>;
  deleteApiKey: (provider: string) => Promise<boolean>;

  gitHubConnectivity: GitConnectivity;
  checkGitHubConnectivity: () => Promise<void>;
  saveGitHubToken: (token: string) => Promise<boolean>;
  deleteGitHubToken: (provider: string) => Promise<boolean>;
  
  // Workspace state management
  workspaceState: WorkspaceState;
  updateWorkspaceState: (updates: Partial<WorkspaceState>) => void;
  clearWorkspaceState: () => void;
}

// Create the context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial API connectivity state
const initialApiConnectivity: ApiConnectivity = {
  isConnected: false,
  isChecking: false,
  lastChecked: null,
  error: null,
  openaiConfigured: false,
  userConfigured: false,
};

// Initial GitHubConnectivity
const initialGitHubConnectivity: GitConnectivity = {
  isConnected: false,
  isChecking: false,
  lastChecked: null,
  error: null,
  githubConfigured: false,
  userConfigured: false,
};

// Initial workspace state
const initialWorkspaceState: WorkspaceState = {
  uploadedFiles: {},
  convertedFiles: {},
  selectedFileName: '',
  githubFiles: null,
  githubDefaultFile: '',
};

// Create the provider component
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [apiConnectivity, setApiConnectivity] = useState<ApiConnectivity>(() => {
    // Load userConfigured state from localStorage on initialization
    try {
      const savedUserConfigured = localStorage.getItem('legacyCodeModernizer_userConfigured');
      return {
        ...initialApiConnectivity,
        userConfigured: savedUserConfigured === 'true'
      };
    } catch (error) {
      return initialApiConnectivity;
    }
  });

  const [gitHubConnectivity, setgitHubConnectivity] = useState<GitConnectivity>(() => {
    // Load userConfigured state from localStorage on initialization
    try {
      const savedUserConfigured = localStorage.getItem('legacyCodeModernizer_userConfigured');
      return {
        ...initialGitHubConnectivity,
        userConfigured: savedUserConfigured === 'true'
      };
    } catch (error) {
      return initialGitHubConnectivity;
    }
  });
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>(initialWorkspaceState);

  const addReport = (reportData: Omit<Report, 'id' | 'timestamp'>) => {
    const newReport: Report = {
      ...reportData,
      id: Date.now(),
      timestamp: new Date(),
    };
    setReports(prevReports => [newReport, ...prevReports]);
  };

  const checkApiConnectivity = useCallback(async (): Promise<void> => {
    setApiConnectivity(prev => ({ ...prev, isChecking: true, error: null }));
    
    try {
      const response = await fetch('http://localhost:5000/api/health');
      const data = await response.json();
      
      if (response.ok) {
        
        setApiConnectivity(prev => ({
          ...prev,
          isConnected: true,
          isChecking: false,
          lastChecked: new Date(),
          error: null,
          openaiConfigured: data.openai_configured || false,
          // Keep userConfigured as is, don't modify it based on backend state
          userConfigured: prev.userConfigured,
        }));
      } else {
        throw new Error(data.error || 'Health check failed');
      }
    } catch (error) {
      setApiConnectivity(prev => ({
        ...prev,
        isConnected: false,
        isChecking: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Connection failed',
        openaiConfigured: false,
        userConfigured: false,
      }));
    }
  }, []); // No dependencies needed since we're only using setState


  const checkGitHubConnectivity = useCallback(async (): Promise<void> => {
    setgitHubConnectivity(prev => ({ ...prev, isChecking: true, error: null }));
    
    try {
      const response = await fetch('http://localhost:5000/api/health');
      const data = await response.json();
      
      if (response.ok) {
        
        setgitHubConnectivity(prev => ({
          ...prev,
          isConnected: true,
          isChecking: false,
          lastChecked: new Date(),
          error: null,
          githubConfigured: data.openai_configured || false,
          // Keep userConfigured as is, don't modify it based on backend state
          userConfigured: prev.userConfigured,
        }));
      } else {
        throw new Error(data.error || 'Health check failed');
      }
    } catch (error) {
      setgitHubConnectivity(prev => ({
        ...prev,
        isConnected: false,
        isChecking: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Connection failed',
        githubConfigured: false,
        userConfigured: false,
      }));
    }
  }, []); // No dependencies needed since we're only using setState

  const saveApiKey = useCallback(async (apiKey: string): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:5000/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'openai',
          api: apiKey,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.status === 'success') {
        // Mark as user configured and save to localStorage
        localStorage.setItem('legacyCodeModernizer_userConfigured', 'true');
        
        // Update state with userConfigured flag and then check connectivity
        setApiConnectivity(prev => ({
          ...prev,
          userConfigured: true,
          isConnected: true, // Assume connected since API save succeeded
          openaiConfigured: true // Assume configured since we just saved a key
        }));
        
        // Still check connectivity to get accurate server state
        await checkApiConnectivity();
        return true;
      } else {
        throw new Error(data.message || 'Failed to save API key');
      }
    } catch (error) {
      setApiConnectivity(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save API key',
      }));
      return false;
    }
  }, [checkApiConnectivity]);

  const saveGitHubToken = useCallback(async (token: string): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:5000/api/gitsave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'GitHub',
          token: token,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.status === 'success') {
        // Mark as user configured and save to localStorage
        localStorage.setItem('legacyCodeModernizer_userConfigured', 'true');
        
        // Update state with userConfigured flag and then check connectivity
        setgitHubConnectivity(prev => ({
          ...prev,
          userConfigured: true,
          isConnected: true, // Assume connected since API save succeeded
          githubConfigured: true // Assume configured since we just saved a key
        }));
        
        // Still check connectivity to get accurate server state
        await checkGitHubConnectivity();
        return true;
      } else {
        throw new Error(data.message || 'Failed to save GitHub Token');
      }
    } catch (error) {
      setgitHubConnectivity(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save GitHub Token',
      }));
      return false;
    }
  }, [checkGitHubConnectivity]);

  const deleteApiKey = useCallback(async (provider: string): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:5000/api/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: provider,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.status === 'success') {
        // After deleting API key, update connectivity state and clear localStorage
        localStorage.setItem('legacyCodeModernizer_userConfigured', 'false');
        setApiConnectivity(prev => ({
          ...prev,
          isConnected: false,
          openaiConfigured: false,
          userConfigured: false,
          error: null,
        }));
        return true;
      } else {
        throw new Error(data.message || 'Failed to delete API key');
      }
    } catch (error) {
      setApiConnectivity(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete API key',
      }));
      return false;
    }
  }, []);


  const deleteGitHubToken = useCallback(async (provider: string): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:5000/api/gitdelete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: provider,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.status === 'success') {
        // After deleting API key, update connectivity state and clear localStorage
        localStorage.setItem('legacyCodeModernizer_userConfigured', 'false');
        setgitHubConnectivity(prev => ({
          ...prev,
          isConnected: false,
          githubConfigured: false,
          userConfigured: false,
          error: null,
        }));
        return true;
      } else {
        throw new Error(data.message || 'Failed to delete GitHub Token');
      }
    } catch (error) {
      setgitHubConnectivity(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete GitHub Token',
      }));
      return false;
    }
  }, []);

  const updateWorkspaceState = (updates: Partial<WorkspaceState>) => {
    setWorkspaceState(prev => ({ ...prev, ...updates }));
  };

  const clearWorkspaceState = () => {
    setWorkspaceState(initialWorkspaceState);
  };

  const latestReport = reports.length > 0 ? reports[0] : null;

  // Check API connectivity on app startup if user has configured it
  useEffect(() => {
    const initializeApiStatus = async () => {
      // Get the initial userConfigured state from localStorage
      const savedUserConfigured = localStorage.getItem('legacyCodeModernizer_userConfigured');
      if (savedUserConfigured === 'true') {
        await checkApiConnectivity();
      }
    };
    
    initializeApiStatus();
  }, [checkApiConnectivity]); // Only run once on mount

  useEffect(() => {
    const initializeGitStatus = async () => {
      // Get the initial userConfigured state from localStorage
      const savedUserConfigured = localStorage.getItem('legacyCodeModernizer_userConfigured');
      if (savedUserConfigured === 'true') {
        await checkGitHubConnectivity();
      }
    };
    
    initializeGitStatus();
  }, [checkGitHubConnectivity]); // Only run once on mount

  return (
    <AppContext.Provider value={{ 
      reports, 
      addReport, 
      latestReport,
      apiConnectivity,
      checkApiConnectivity,
      saveApiKey,
      deleteApiKey,
      gitHubConnectivity,
      checkGitHubConnectivity,
      saveGitHubToken,
      deleteGitHubToken,
      workspaceState,
      updateWorkspaceState,
      clearWorkspaceState
    }}>
      {children}
    </AppContext.Provider>
  );
};

// Create a custom hook for easy context access
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};