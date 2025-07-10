
import React, { useState } from 'react';
import { Upload, FileCode, FolderOpen, X } from 'lucide-react';

const UploadPanel: React.FC = () => {
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    // Simulate file upload
    setUploadedFiles(['legacy_auth.py', 'database_utils.py', 'config_parser.py']);
  };

  const removeFile = (fileName: string) => {
    setUploadedFiles(uploadedFiles.filter(file => file !== fileName));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Upload Python 2 Code</h2>
        
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            dragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 bg-white hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Drop your Python 2 files here
          </h3>
          <p className="text-gray-600 mb-4">
            or click to browse and select files
          </p>
          <div className="flex gap-3 justify-center">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
              <FolderOpen size={16} />
              Browse Files
            </button>
            <button className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Select Folder
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Supports .py files and .zip archives up to 100MB
          </p>
        </div>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Files</h3>
            <div className="space-y-2">
              {uploadedFiles.map((fileName) => (
                <div key={fileName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileCode className="text-blue-500" size={20} />
                    <span className="font-medium text-gray-900">{fileName}</span>
                    <span className="text-sm text-gray-500">Python 2</span>
                  </div>
                  <button 
                    onClick={() => removeFile(fileName)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {uploadedFiles.length} files ready for conversion
              </span>
              <button className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors">
                Start Conversion
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPanel;
