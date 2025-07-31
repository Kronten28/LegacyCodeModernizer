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
  
  // Workspace state management
  workspaceState: WorkspaceState;
  updateWorkspaceState: (updates: Partial<WorkspaceState>) => void;
  clearWorkspaceState: () => void;
}

// Create the context
const AppContext = createContext<AppContextType | undefined>(undefined);

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
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>(initialWorkspaceState);

  const addReport = (reportData: Omit<Report, 'id' | 'timestamp'>) => {
    const newReport: Report = {
      ...reportData,
      id: Date.now(),
      timestamp: new Date(),
    };
    setReports(prevReports => [newReport, ...prevReports]);
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