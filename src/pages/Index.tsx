
import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Dashboard from '../components/Dashboard';
import UploadPanel from '../components/UploadPanel';
import CodeConverter from '../components/CodeConverter';
import SecurityScanner from '../components/SecurityScanner';
import SummaryReport from '../components/SummaryReport';
import Settings from '../components/Settings';

const Index = () => {
  const [activeView, setActiveView] = useState('dashboard');

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'upload':
        return <UploadPanel />;
      case 'convert':
        return <CodeConverter />;
      case 'security':
        return <SecurityScanner />;
      case 'report':
        return <SummaryReport />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default Index;
