import React, { createContext, useState, useContext, ReactNode } from 'react';

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
  const [apiConnectivity, setApiConnectivity] = useState<ApiConnectivity>(initialApiConnectivity);
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>(initialWorkspaceState);

  const addReport = (reportData: Omit<Report, 'id' | 'timestamp'>) => {
    const newReport: Report = {
      ...reportData,
      id: Date.now(),
      timestamp: new Date(),
    };
    setReports(prevReports => [newReport, ...prevReports]);
  };

  const checkApiConnectivity = async (): Promise<void> => {
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
      }));
    }
  };

  const saveApiKey = async (apiKey: string): Promise<boolean> => {
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
        // After saving API key, check connectivity
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
  };

  const updateWorkspaceState = (updates: Partial<WorkspaceState>) => {
    setWorkspaceState(prev => ({ ...prev, ...updates }));
  };

  const clearWorkspaceState = () => {
    setWorkspaceState(initialWorkspaceState);
  };

  const latestReport = reports.length > 0 ? reports[0] : null;

  return (
    <AppContext.Provider value={{ 
      reports, 
      addReport, 
      latestReport,
      apiConnectivity,
      checkApiConnectivity,
      saveApiKey,
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