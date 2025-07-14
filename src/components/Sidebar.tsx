import React from 'react';
import { 
  FileCode, 
  Upload, 
  RefreshCw, 
  Shield, 
  FileText, 
  Settings,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from "react-router-dom"; 

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const navigate = useNavigate(); 

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FileCode },
    { id: 'upload', label: 'Upload Code', icon: Upload },
    { id: 'convert', label: 'Convert', icon: RefreshCw },
    { id: 'security', label: 'Security Scan', icon: Shield },
    { id: 'report', label: 'Summary Report', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-blue-400">Legacy Code Modernizer</h1>
        <p className="text-sm text-slate-400 mt-1">Python 2 → 3 Converter</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                onViewChange(item.id);       
                navigate(item.id === 'dashboard' ? '/' : `/${item.id}`);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight size={16} />}
            </button>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-700 text-xs text-slate-400">
        <div>API Status: Connected</div>
        <div>Model: GPT-4.0</div>
      </div>
    </div>
  );
};

export default Sidebar;
