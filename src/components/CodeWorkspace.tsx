import React, { useRef, useState, useEffect } from 'react';
import { Upload, Download, Copy, RotateCcw, FileText, FolderOpen, X, Play } from 'lucide-react';
import axios from "axios";
import { saveAs } from "file-saver";
import { toast } from "@/components/ui/sonner";
import { useLocation } from 'react-router-dom';

const CodeWorkspace: React.FC = () => {
  const [dragOver, setDragOver] = useState(false);
  const location = useLocation();
  const passedCode = location.state?.code || "";
  const [python2Code, setPython2Code] = useState(passedCode);

  const [python3Code, setPython3Code] = useState(`Converted code will appear here...`);

  const [isConverting, setIsConverting] = useState(false);

  const [codeChanges, setCodeChanges] = useState("");

  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});

  const [convertedFiles, setConvertedFiles] = useState<Record<string, string>>({});
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  const [selectedConvertedFileName, setSelectedConvertedFileName] = useState<string>("");
  
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const leftPanelRef = useRef<HTMLTextAreaElement | null>(null);
  const rightPanelRef = useRef<HTMLTextAreaElement | null>(null);


  // Scroll sync between panels
  const handleScroll = (source: 'left' | 'right') => {
    if (source === 'left' && leftPanelRef.current && rightPanelRef.current) {
      const scrollPercentage = leftPanelRef.current.scrollTop / 
        (leftPanelRef.current.scrollHeight - leftPanelRef.current.clientHeight);
      rightPanelRef.current.scrollTop = scrollPercentage * 
        (rightPanelRef.current.scrollHeight - rightPanelRef.current.clientHeight);
    } else if (source === 'right' && leftPanelRef.current && rightPanelRef.current) {
      const scrollPercentage = rightPanelRef.current.scrollTop / 
        (rightPanelRef.current.scrollHeight - rightPanelRef.current.clientHeight);
      leftPanelRef.current.scrollTop = scrollPercentage * 
        (leftPanelRef.current.scrollHeight - leftPanelRef.current.clientHeight);
    }
  };

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

  const files = Array.from(e.dataTransfer.files);
  if (files.length === 0) return;

  const pythonFiles = files.filter(f => f.name.toLowerCase().endsWith('.py'));
  const unsupported = files.filter(f => !f.name.toLowerCase().endsWith('.py'));

  if (unsupported.length > 0) {
    toast('Unsupported file type dropped', {
      description: 'Only .py files are allowed.'
    });
  }

  if (pythonFiles.length === 0) return;

  pythonFiles.forEach((file) => {
    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result;
      if (typeof text === 'string') {
        setUploadedFiles(prev => {
          const merged = { ...prev, [file.name]: text };

          // Set selected if it's the first one uploaded or none selected yet
          if (!selectedFileName) {
            setSelectedFileName(file.name);
            setPython2Code(text);
          }

          return merged;
        });
      }
    };
    reader.onerror = () => console.error('Could not read file:', reader.error);
    reader.readAsText(file);
  });
};


  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  const newFiles: Record<string, string> = {};
  const fileList = Array.from(files);

  fileList.forEach((file) => {
    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result;
      if (typeof text === "string") {
        newFiles[file.name] = text;

        setUploadedFiles(prev => {
          const merged = { ...prev, [file.name]: text };

          // Set first file as selected if none is selected
          if (!selectedFileName) {
            setSelectedFileName(file.name);
            setPython2Code(text);
          }

          return merged;
        });
      }
    };
    reader.onerror = () => console.error("Could not read file:", reader.error);
    reader.readAsText(file);
  });

  // Reset the file input value to allow re-upload of same file name
  e.target.value = "";
}


  const removeFile = (fileName: string) => {
    const { [fileName]: _, ...rest } = uploadedFiles;
    setUploadedFiles(rest);
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleModernize = async () => {
    if (Object.keys(uploadedFiles).length === 0) {
      setPython3Code("// No uploaded files to convert.");
      return;
    }

    setIsConverting(true);
    setPython3Code("// Translating...");
    setCodeChanges("");

    const newConvertedFiles: Record<string, string> = {};
    let firstSet = false;

    for (const [fileName, fileContent] of Object.entries(uploadedFiles)) {
      try {
        const res = await axios.post("http://localhost:5000/migrate", { code: fileContent });
        /*await axios.post("http://localhost:5000/migrate-multi", {files: uploadedFiles  // object with filename -> content}); */
        if (res.data.status === "success") {
          newConvertedFiles[fileName] = res.data.result;

          // Automatically set the first result as the active view
          if (!firstSet) {
            setSelectedConvertedFileName(fileName);
            setPython3Code(res.data.result);
            setCodeChanges(res.data.explain || "");
            firstSet = true;
          }
        } 
        else {
          newConvertedFiles[fileName] = `// BackendErr: ${res.data.message || "Unknown Err"}`;
        }
      } 
      catch (e: any) {
        newConvertedFiles[fileName] = `// NetworkErr: ${e.message}`;
      }
    }
    setConvertedFiles(newConvertedFiles);
    setIsConverting(false);
  };

  const handleDownload = () => {
  const filename = selectedFileName ? `${selectedFileName}` : "converted_code.py";
  saveAs(
    new Blob([python3Code], { type: "text/x-python;charset=utf-8" }),
    filename
  );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Code Workspace</h2>
          <div className="flex gap-3">
            <button 
              onClick={handleModernize}
              disabled={isConverting}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isConverting ? <RotateCcw size={16} className="animate-spin" /> : <Play size={16} />}
              {isConverting ? 'Converting...' : 'Convert to Python 3'}
            </button>
          </div>
        </div>

        {/* Split View Code Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[60vh]">
          {/* Left Panel - Python 2 Input */}
          <div className="bg-white rounded-lg shadow-sm border flex flex-col">
            <div className="p-4 border-b bg-red-50 border-red-200 flex items-center justify-between">
              <h3 className="font-semibold text-red-800 flex items-center gap-2">
                <FileText size={16} />
                Python 2 (Legacy)
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
                >
                  <FolderOpen size={12} />
                  Upload
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: "none" }}
                  accept=".py"
                  onChange={handleUpload}
                  multiple
                />
              </div>
            </div>
            <div className="flex-1 relative">
              <textarea
                ref={leftPanelRef}
                value={python2Code}
                onChange={(e) => setPython2Code(e.target.value)}
                onScroll={() => handleScroll('left')}
                className="w-full h-full p-4 font-mono text-sm border-0 resize-none focus:outline-none bg-gray-900 text-green-400"
                placeholder="Paste your Python 2 code here or upload a file..."
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />
              {dragOver && (
                <div className="absolute inset-0 bg-blue-500 bg-opacity-20 border-2 border-dashed border-blue-500 flex items-center justify-center">
                  <div className="text-blue-700 font-semibold">Drop Python files here</div>
                </div>
              )}
              <button 
                className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-white" 
                onClick={() => handleCopy(python2Code)}
              >
                <Copy size={14} />
              </button>
            </div>
            {Object.keys(uploadedFiles).length > 0 && (
              <div className="mt-2">
                <label htmlFor="file-switcher" className="text-sm text-gray-700 mr-2 ">View file:</label>
                <select
                  id="file-switcher"
                  value={selectedFileName}
                  onChange={(e) => {
                    setSelectedFileName(e.target.value);
                    setPython2Code(uploadedFiles[e.target.value]);
                  }}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
              {Object.keys(uploadedFiles).map((fileName) => (
                <option key={fileName} value={fileName}>
                  {fileName}
                </option>
              ))}
                </select>
              </div>
            )}
          </div>

          {/* Right Panel - Python 3 Output */}
          <div className="bg-white rounded-lg shadow-sm border flex flex-col">
            <div className="p-4 border-b bg-green-50 border-green-200 flex items-center justify-between">
              <h3 className="font-semibold text-green-800 flex items-center gap-2">
                <FileText size={16} />
                Python 3 (Converted)
              </h3>
              <button 
                onClick={handleDownload}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors flex items-center gap-1"
              >
                <Download size={12} />
                Download
              </button>
            </div>
            <div className="flex-1 relative">
              <textarea
                ref={rightPanelRef}
                value={python3Code}
                readOnly
                onScroll={() => handleScroll('right')}
                className="w-full h-full p-4 font-mono text-sm border-0 resize-none focus:outline-none bg-gray-900 text-blue-400"
                placeholder="Converted code will appear here..."
              />
              <button 
                className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-white" 
                onClick={() => handleCopy(python3Code)}
              >
                <Copy size={14} />
              </button>
            </div>
            {Object.keys(convertedFiles).length > 0 && (
              <div className="mt-2">
                <label htmlFor="file-switcher" className="text-sm text-gray-700 mr-2 ">View file:</label>
                <select
                  id="file-switcher"
                  value={selectedConvertedFileName}
                  onChange={(e) => {
                    setSelectedConvertedFileName(e.target.value);
                    setPython3Code(convertedFiles[e.target.value]);
                  }}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
              {Object.keys(convertedFiles).map((fileName) => (
                <option key={fileName} value={fileName}>
                  {fileName}
                </option>
              ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Uploaded Files Section */}
        {Object.keys(uploadedFiles).length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Uploaded Files</h4>
            <div className="flex flex-wrap gap-2">
              {Object.keys(uploadedFiles).map((fileName) => (
                <div key={fileName} className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
                  <FileText className="text-blue-500" size={16} />
                  <span className="text-sm font-medium text-gray-900">{fileName}</span>
                  <button 
                    onClick={() => removeFile(fileName)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Change Explanation Panel */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h4 className="font-semibold text-gray-900">Change Explanation</h4>
          </div>
          <div className="p-4">
            {codeChanges ? (
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  <strong>Translation Summary:</strong>
                </div>
                <div className="p-4 bg-white text-gray-800 text-md rounded-md border border-gray-200 shadow-sm space-y-2">
                  {codeChanges.split('\n').map((line, i) => (
                    <p key={i} className="whitespace-pre-wrap">{line}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-gray-500 italic text-sm">
                Run a conversion to see detailed changes and explanations here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeWorkspace;
