
import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, Key, Globe, Shield } from 'lucide-react';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState({
    aiModel: 'gpt-4.0',
    language: 'en',
    secureMode: true,
    autoScan: true,
    complianceStandards: ['hipaa', 'iso27001']
  });

  const handleSave = () => {
    console.log('Settings saved:', settings);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="text-blue-600" size={28} />
          <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
        </div>

        <div className="space-y-6">
          {/* AI Model Settings */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Key className="text-blue-500" size={20} />
              AI Model Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Model
                </label>
                <select 
                  value={settings.aiModel}
                  onChange={(e) => setSettings({...settings, aiModel: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gpt-4.0">GPT-4.1 (Recommended)</option>
                  <option value="gpt-3.5-turbo">GPT-4o (Faster)</option>
                </select>
              </div>
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <strong>GPT-4.1</strong> provides the highest accuracy for code conversion and security scanning.
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
                onChange={(e) => setSettings({...settings, language: e.target.value})}
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
                    onChange={(e) => setSettings({...settings, secureMode: e.target.checked})}
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
                    onChange={(e) => setSettings({...settings, autoScan: e.target.checked})}
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
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSettings({...settings, complianceStandards: [...settings.complianceStandards, 'hipaa']});
                        } else {
                          setSettings({...settings, complianceStandards: settings.complianceStandards.filter(s => s !== 'hipaa')});
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">HIPAA (Healthcare)</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={settings.complianceStandards.includes('iso27001')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSettings({...settings, complianceStandards: [...settings.complianceStandards, 'iso27001']});
                        } else {
                          setSettings({...settings, complianceStandards: settings.complianceStandards.filter(s => s !== 'iso27001')});
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">ISO 27001 (Information Security)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button 
              onClick={handleSave}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Save size={16} />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;