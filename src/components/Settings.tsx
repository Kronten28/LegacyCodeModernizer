import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Key, Globe, Shield, CheckCircle, Eye, EyeOff, Wifi, WifiOff, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { toast } from "@/components/ui/sonner";
import { useAppContext } from '@/context/AppContext';

interface SettingsState {
  aiModel: string;
  openaiApiKey: string;
  language: string;
  secureMode: boolean;
  autoScan: boolean;
  complianceStandards: string[];
}

const Settings: React.FC = () => {
  const { apiConnectivity, checkApiConnectivity, saveApiKey, deleteApiKey } = useAppContext();
  const [settings, setSettings] = useState<SettingsState>({
    aiModel: 'GPT-4.1',
    openaiApiKey: '',
    language: 'en',
    secureMode: true,
    autoScan: true,
    complianceStandards: ['hipaa', 'iso27001']
  });

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Load settings from localStorage on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Load existing API key when user configuration or connection status changes
  useEffect(() => {
    loadExistingApiKey();
  }, [apiConnectivity.userConfigured, apiConnectivity.isConnected, apiConnectivity.openaiConfigured, checkApiConnectivity]);

  const loadExistingApiKey = async () => {
    try {
      // Only check if user has previously configured the API
      if (apiConnectivity.userConfigured) {
        await checkApiConnectivity();
        if (apiConnectivity.isConnected && apiConnectivity.openaiConfigured) {
          // We know there's a key, but we don't show it for security reasons
          // Just indicate that there's an existing key
          setSettings(prev => ({ 
            ...prev, 
            openaiApiKey: '••••••••••••••••••••••••••••••••••••••••••••••••••••' // Masked key
          }));
        }
      }
    } catch (error) {
      console.error('Error checking existing API key:', error);
    }
  };

  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('legacyCodeModernizer_settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
        setLastSaved(new Date(parsedSettings.lastSaved || Date.now()));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast("Error loading settings", { 
        description: "Using default settings instead." 
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const settingsToSave = {
        ...settings,
        lastSaved: new Date().toISOString()
      };
      
      // Save to localStorage
      localStorage.setItem('legacyCodeModernizer_settings', JSON.stringify(settingsToSave));
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('settingsUpdated', { 
        detail: settingsToSave 
      }));
      
      setLastSaved(new Date());
      
      toast("Settings saved successfully!", {
        description: "Your preferences have been updated.",
        icon: <CheckCircle className="text-green-500" size={16} />
      });
      
    } catch (error) {
      console.error('Error saving settings:', error);
      toast("Failed to save settings", { 
        description: "Please try again." 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleModelChange = (newModel: string) => {
    setSettings(prev => ({ ...prev, aiModel: newModel }));
  };

  const handleApiKeyChange = (newApiKey: string) => {
    setSettings(prev => ({ ...prev, openaiApiKey: newApiKey }));
  };

  const handleConnectApi = async () => {
    if (!settings.openaiApiKey.trim()) {
      toast("Please enter an API key", {
        description: "An OpenAI API key is required to establish connection.",
        icon: <AlertCircle className="text-red-500" size={16} />
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      const success = await saveApiKey(settings.openaiApiKey.trim());
      
      if (success) {
        toast("API connection established!", {
          description: "Successfully connected to OpenAI API.",
          icon: <CheckCircle className="text-green-500" size={16} />
        });
      } else {
        toast("Failed to establish API connection", {
          description: apiConnectivity.error || "Please check your API key and try again.",
          icon: <AlertCircle className="text-red-500" size={16} />
        });
      }
    } catch (error) {
      toast("Connection error", {
        description: "An unexpected error occurred while connecting.",
        icon: <AlertCircle className="text-red-500" size={16} />
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestConnection = async () => {
    await checkApiConnectivity();
    
    if (apiConnectivity.isConnected) {
      toast("Connection test successful!", {
        description: apiConnectivity.openaiConfigured ? 
          "API is connected and OpenAI is configured." : 
          "API is connected but OpenAI key needs to be configured.",
        icon: <CheckCircle className="text-green-500" size={16} />
      });
    } else {
      toast("Connection test failed", {
        description: apiConnectivity.error || "Unable to connect to the API server.",
        icon: <AlertCircle className="text-red-500" size={16} />
      });
    }
  };

  const handleClearApiKey = async () => {
    setIsClearing(true);
    
    try {
      const success = await deleteApiKey('openai');
      
      if (success) {
        setSettings(prev => ({ ...prev, openaiApiKey: '' }));
        toast("API key cleared successfully!", {
          description: "Your OpenAI API key has been removed from storage.",
          icon: <CheckCircle className="text-green-500" size={16} />
        });
      } else {
        toast("Failed to clear API key", {
          description: "Please try again.",
          icon: <AlertCircle className="text-red-500" size={16} />
        });
      }
    } catch (error) {
      toast("Error clearing API key", {
        description: "An unexpected error occurred.",
        icon: <AlertCircle className="text-red-500" size={16} />
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    setSettings(prev => ({ ...prev, language: newLanguage }));
  };

  const handleSecureModeChange = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, secureMode: enabled }));
  };

  const handleAutoScanChange = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, autoScan: enabled }));
  };

  const handleComplianceStandardChange = (standard: string, enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      complianceStandards: enabled
        ? [...prev.complianceStandards, standard]
        : prev.complianceStandards.filter(s => s !== standard)
    }));
  };

  const formatLastSaved = () => {
    if (!lastSaved) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - lastSaved.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) return `${diffSecs} seconds ago`;
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)} minutes ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)} hours ago`;
    return lastSaved.toLocaleDateString();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <SettingsIcon className="text-blue-600" size={28} />
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
              {lastSaved && (
                <p className="text-sm text-gray-500 mt-1">
                  Last saved: {formatLastSaved()}
                </p>
              )}
            </div>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>

        <div className="space-y-6">
          {/* AI Model Settings */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Key className="text-blue-500" size={20} />
                AI Model Configuration
              </h3>
              <div className="flex items-center gap-2">
                {apiConnectivity.isConnected ? (
                  <div className="flex items-center gap-1 text-green-600 text-sm">
                    <Wifi size={16} />
                    <span>Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-600 text-sm">
                    <WifiOff size={16} />
                    <span>Disconnected</span>
                  </div>
                )}
                {apiConnectivity.lastChecked && (
                  <span className="text-xs text-gray-500">
                    Last checked: {apiConnectivity.lastChecked.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OpenAI API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={settings.openaiApiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="Enter your OpenAI API key"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  <em>Used to authenticate and run code conversion through OpenAI. Your key is stored securely.</em>
                </p>
                
                {/* Connection controls */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleConnectApi}
                    disabled={isConnecting || !settings.openaiApiKey.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wifi size={14} />
                        Connect API
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleTestConnection}
                    disabled={apiConnectivity.isChecking}
                    className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {apiConnectivity.isChecking ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={14} />
                        Test Connection
                      </>
                    )}
                  </button>
                  
                  {(apiConnectivity.isConnected && apiConnectivity.openaiConfigured) && (
                    <button
                      onClick={handleClearApiKey}
                      disabled={isClearing}
                      className="border border-red-300 text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {isClearing ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Clearing...
                        </>
                      ) : (
                        <>
                          <Trash2 size={14} />
                          Clear API Key
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Connection status and error display */}
                {apiConnectivity.error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700 text-sm">
                      <AlertCircle size={16} />
                      <span className="font-medium">Connection Error</span>
                    </div>
                    <p className="text-red-600 text-sm mt-1">{apiConnectivity.error}</p>
                  </div>
                )}

                {apiConnectivity.isConnected && apiConnectivity.openaiConfigured && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 text-sm">
                      <CheckCircle size={16} />
                      <span className="font-medium">API Connected</span>
                    </div>
                    <p className="text-green-600 text-sm mt-1">OpenAI API is configured and ready to use.</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Model
                </label>
                <select 
                  value={settings.aiModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="GPT-4.1">GPT-4.1 (Recommended)</option>
                  <option value="GPT-4o">GPT-4o (Faster)</option>
                  <option value="GPT-3.5-turbo">GPT-3.5 Turbo (Budget)</option>
                </select>
              </div>
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <strong>GPT-4.1</strong> provides the highest accuracy for code conversion and security scanning.
                <br />
                <strong>GPT-4o</strong> offers faster response times with good accuracy.
                <br />
                <strong>GPT-3.5 Turbo</strong> is the most cost-effective option.
              </div>
            </div>
          </div>

          {/* Localization */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="text-green-500" size={20} />
              Localization
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interface Language
              </label>
              <select 
                value={settings.language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="text-orange-500" size={20} />
              Security & Privacy
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Secure Mode</label>
                  <p className="text-sm text-gray-500">Keep all file processing local (no cloud upload)</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.secureMode}
                    onChange={(e) => handleSecureModeChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Auto Security Scan</label>
                  <p className="text-sm text-gray-500">Automatically scan converted code for security issues</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.autoScan}
                    onChange={(e) => handleAutoScanChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Compliance Standards
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={settings.complianceStandards.includes('hipaa')}
                      onChange={(e) => handleComplianceStandardChange('hipaa', e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">HIPAA (Healthcare)</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={settings.complianceStandards.includes('iso27001')}
                      onChange={(e) => handleComplianceStandardChange('iso27001', e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">ISO 27001 (Information Security)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;