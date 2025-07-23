import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FileCode,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { reports } = useAppContext();

  const totalFiles = reports.length;
  const successfulConversions = reports.filter((r) => r.success).length;
  const successRate =
    totalFiles > 0
      ? ((successfulConversions / totalFiles) * 100).toFixed(1)
      : "0.0";
  const totalSecurityIssues = reports.reduce(
    (acc, r) => acc + r.securityIssues.length,
    0
  );
  const avgTime =
    totalFiles > 0
      ? (
          reports.reduce((acc, r) => acc + r.executionTime, 0) /
          totalFiles /
          1000
        ).toFixed(1)
      : "0.0";

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Files Converted</p>
                <p className="text-2xl font-bold text-gray-900">{totalFiles}</p>
              </div>
              <FileCode className="text-blue-500" size={24} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {successRate}%
                </p>
              </div>
              <CheckCircle className="text-green-500" size={24} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Security Issues</p>
                <p className="text-2xl font-bold text-orange-600">
                  {totalSecurityIssues}
                </p>
              </div>
              <AlertTriangle className="text-orange-500" size={24} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Time</p>
                <p className="text-2xl font-bold text-gray-900">{avgTime}s</p>
              </div>
              <Clock className="text-purple-500" size={24} />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Start
            </h3>
            <div className="space-y-3">
              <button
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => navigate("/upload")}
              >
                Convert New Files
              </button>
              <button
                className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={!reports.length}
                onClick={() => navigate("/report")}
              >
                View Last Conversion
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3 text-sm">
              {reports.slice(0, 3).map(report => (
                <div key={report.id} className="flex items-center gap-3">
                  {report.success ? <CheckCircle size={16} className="text-green-500" /> : <AlertTriangle size={16} className="text-red-500" />}
                  <span className="text-gray-600">
                    Conversion {report.success ? 'succeeded' : 'failed'} at {report.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {reports.length === 0 && <p className="text-gray-500">No activity yet.</p>}
            </div>
          </div>
        </div>

        {/* Progress Chart Placeholder */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Conversion Trends
          </h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <TrendingUp size={48} className="mx-auto mb-2" />
              <p>Chart showing conversion success rates over time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;