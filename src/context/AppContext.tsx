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

// Define the shape of the context state
interface AppContextType {
  reports: Report[];
  addReport: (report: Omit<Report, 'id' | 'timestamp'>) => void;
  latestReport: Report | null;
}

// Create the context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Create the provider component
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [reports, setReports] = useState<Report[]>([]);

  const addReport = (reportData: Omit<Report, 'id' | 'timestamp'>) => {
    const newReport: Report = {
      ...reportData,
      id: Date.now(),
      timestamp: new Date(),
    };
    setReports(prevReports => [newReport, ...prevReports]);
  };

  const latestReport = reports.length > 0 ? reports[0] : null;

  return (
    <AppContext.Provider value={{ reports, addReport, latestReport }}>
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