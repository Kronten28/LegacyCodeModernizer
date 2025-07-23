import React from 'react';
import { Download, FileText, CheckCircle, AlertTriangle, Clock, FileCode } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';

const SummaryReport: React.FC = () => {
  const { latestReport } = useAppContext();

  if (!latestReport) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto text-gray-400 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-gray-700">No Report Generated</h2>
          <p className="text-gray-500 mt-2">Please convert a file in the workspace to see a summary.</p>
        </div>
      </div>
    );
  }

  const reportData = {
    timestamp: latestReport.timestamp.toLocaleString(),
    totalFiles: 1, // Represents the single file converted
    successfulConversions: latestReport.success ? 1 : 0,
    failedConversions: latestReport.success ? 0 : 1,
    executionTime: `${(latestReport.executionTime / 1000).toFixed(2)} seconds`,
    securityIssues: {
      high: latestReport.securityIssues.filter(i => i.severity === 'high').length,
      medium: latestReport.securityIssues.filter(i => i.severity === 'medium').length,
      low: latestReport.securityIssues.filter(i => i.severity === 'low').length
    },
    // A simple way to get major changes from the explanation
    majorChanges: latestReport.explanation.split('\n').filter(line => line.startsWith('* ')).map(line => line.substring(2))
  };

  const successRate = ((reportData.successfulConversions / reportData.totalFiles) * 100).toFixed(1);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="text-blue-600" size={28} />
            <h2 className="text-3xl font-bold text-gray-900">Conversion Summary</h2>
          </div>
        </div>

        {/* Overview Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Conversion Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <FileCode className="mx-auto text-blue-600 mb-2" size={24} />
              <div className="text-2xl font-bold text-blue-600">{reportData.totalFiles}</div>
              <div className="text-sm text-gray-600">Total Files</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="mx-auto text-green-600 mb-2" size={24} />
              <div className="text-2xl font-bold text-green-600">{successRate}%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <AlertTriangle className="mx-auto text-orange-600 mb-2" size={24} />
              <div className="text-2xl font-bold text-orange-600">{Object.values(reportData.securityIssues).reduce((a, b) => a + b, 0)}</div>
              <div className="text-sm text-gray-600">Security Issues</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Clock className="mx-auto text-purple-600 mb-2" size={24} />
              <div className="text-2xl font-bold text-purple-600">{reportData.executionTime}</div>
              <div className="text-sm text-gray-600">Total Time</div>
            </div>
          </div>
        </div>

        {/* Detailed Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Conversion Results */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Results</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-green-600" size={16} />
                  <span className="text-green-800">Successful Conversions</span>
                </div>
                <span className="font-semibold text-green-600">{reportData.successfulConversions}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-red-600" size={16} />
                  <span className="text-red-800">Failed Conversions</span>
                </div>
                <span className="font-semibold text-red-600">{reportData.failedConversions}</span>
              </div>
            </div>
          </div>

          {/* Security Summary */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Issues</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-red-800">High Severity</span>
                <span className="font-semibold text-red-600">{reportData.securityIssues.high}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-orange-800">Medium Severity</span>
                <span className="font-semibold text-orange-600">{reportData.securityIssues.medium}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <span className="text-yellow-800">Low Severity</span>
                <span className="font-semibold text-yellow-600">{reportData.securityIssues.low}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Major Changes */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Major Changes Applied</h3>
          <div className="space-y-2">
            {reportData.majorChanges.map((change, index) => (
              <div key={index} className="flex items-center gap-3 p-2">
                <CheckCircle className="text-green-500 flex-shrink-0" size={16} />
                <span className="text-gray-700">{change}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Report Metadata */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Generated:</span>
              <span className="ml-2 font-medium">{reportData.timestamp}</span>
            </div>
            <div>
              <span className="text-gray-600">AI Model:</span>
              <span className="ml-2 font-medium">GPT-4.1</span>
            </div>
            <div>
              <span className="text-gray-600">Version:</span>
              <span className="ml-2 font-medium">Legacy Code Modernizer v1.0.0</span>
            </div>
            <div>
              <span className="text-gray-600">Compliance Standards:</span>
              <span className="ml-2 font-medium">HIPAA, ISO 27001</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryReport;