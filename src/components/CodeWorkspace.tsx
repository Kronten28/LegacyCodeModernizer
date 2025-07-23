import React, { useRef, useState, useEffect } from "react";
import {
  Upload,
  Download,
  Copy,
  RotateCcw,
  FileText,
  FolderOpen,
  X,
  Play,
} from "lucide-react";
import axios from "axios";
import { saveAs } from "file-saver";
import { toast } from "@/components/ui/sonner";
import { useAppContext } from '@/context/AppContext';
import { useLocation } from "react-router-dom";

const CodeWorkspace: React.FC = () => {
  const [dragOver, setDragOver] = useState(false);
  const location = useLocation();
  const passedCode = location.state?.code || "";
  
  // State for file management
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});
  const [convertedFiles, setConvertedFiles] = useState<Record<string, string>>({});
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [selectedConvertedFileName, setSelectedConvertedFileName] = useState<string>("");
  const [isConverting, setIsConverting] = useState(false);

  // Use the context for state management
  const { addReport, latestReport } = useAppContext();

  // Derived state from context and files
  const python2Code = selectedFileName ? uploadedFiles[selectedFileName] || "" : passedCode;
  const python3Code = selectedConvertedFileName 
    ? convertedFiles[selectedConvertedFileName] || "Converted code will appear here..."
    : "Converted code will appear here...";
  const codeChanges = latestReport?.explanation ?? "";

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const leftPanelRef = useRef<HTMLTextAreaElement | null>(null);
  const rightPanelRef = useRef<HTMLTextAreaElement | null>(null);

  // Initialize with passed code if available
  useEffect(() => {
    if (passedCode && Object.keys(uploadedFiles).length === 0 && !selectedFileName) {
      const initialFileName = "pasted_code.py";
      setUploadedFiles({ [initialFileName]: passedCode });
      setSelectedFileName(initialFileName);
    }
  }, [passedCode, uploadedFiles, selectedFileName]);

  // Handle Python 2 code changes
  const handlePython2CodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    if (selectedFileName) {
      setUploadedFiles(prev => ({
        ...prev,
        [selectedFileName]: newCode,
      }));
    } else {
      // Handle case where code is pasted without a file selected
      const newFileName = "untitled.py";
      setUploadedFiles({ [newFileName]: newCode });
      setSelectedFileName(newFileName);
    }
  };

  // Scroll sync between panels
  const handleScroll = (source: "left" | "right") => {
    if (source === "left" && leftPanelRef.current && rightPanelRef.current) {
      const scrollPercentage =
        leftPanelRef.current.scrollTop /
        (leftPanelRef.current.scrollHeight - leftPanelRef.current.clientHeight);
      rightPanelRef.current.scrollTop =
        scrollPercentage *
        (rightPanelRef.current.scrollHeight -
          rightPanelRef.current.clientHeight);
    } else if (
      source === "right" &&
      leftPanelRef.current &&
      rightPanelRef.current
    ) {
      const scrollPercentage =
        rightPanelRef.current.scrollTop /
        (rightPanelRef.current.scrollHeight -
          rightPanelRef.current.clientHeight);
      leftPanelRef.current.scrollTop =
        scrollPercentage *
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

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.py')) {
      toast('Unsupported file type', { 
        description: 'Only .py files are allowed.' 
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result;
      if (typeof text === "string") {
        setUploadedFiles((prev) => {
          const merged = { ...prev, [file.name]: text };

          // Set selected if it's the first one uploaded or none selected yet
          if (!selectedFileName || Object.keys(prev).length === 0) {
            setSelectedFileName(file.name);
          }

          return merged;
        });
      }
    };
    reader.onerror = () =>
      console.error("Could not read file:", reader.error);
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const pythonFiles = files.filter((f) =>
      f.name.toLowerCase().endsWith(".py")
    );
    const unsupported = files.filter(
      (f) => !f.name.toLowerCase().endsWith(".py")
    );

    if (unsupported.length > 0) {
      toast("Unsupported file type dropped", {
        description: "Only .py files are allowed.",
      });
    }

    if (pythonFiles.length === 0) return;

    pythonFiles.forEach(processFile);
  };

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(processFile);

    // Reset the file input value to allow re-upload of same file name
    e.target.value = "";
  }

  const removeFile = (fileName: string) => {
    const { [fileName]: _, ...rest } = uploadedFiles;
    setUploadedFiles(rest);
    
    // Update selected file if the removed file was selected
    if (selectedFileName === fileName) {
      const remainingFiles = Object.keys(rest);
      setSelectedFileName(remainingFiles[0] || "");
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast("Code copied to clipboard!");
    } catch (err) {
      console.error("Copy failed:", err);
      toast("Failed to copy code.", { 
        description: "Please try again." 
      });
    }
  };

  const handleModernize = async () => {
    if (Object.keys(uploadedFiles).length === 0 && !python2Code.trim()) {
      toast("No code to convert.", { 
        description: "Please upload one or more Python 2 files or paste code." 
      });
      return;
    }

    setIsConverting(true);
    setConvertedFiles({});

    const newConvertedFiles: Record<string, string> = {};
    let firstFileProcessed = false;

    // Process uploaded files
    if (Object.keys(uploadedFiles).length > 0) {
      for (const [fileName, fileContent] of Object.entries(uploadedFiles)) {
        const startTime = Date.now();
        try {
          const res = await axios.post("http://localhost:5000/migrate", {
            code: fileContent,
          });
          const endTime = Date.now();

          if (res.data.status === "success") {
            newConvertedFiles[fileName] = res.data.result;

            // TODO: Replace with real security scan logic
            const placeholderSecurityIssues = [];

            addReport({
              success: true,
              executionTime: endTime - startTime,
              originalCode: fileContent,
              convertedCode: res.data.result,
              explanation: res.data.explain || "",
              securityIssues: placeholderSecurityIssues,
            });

            if (!firstFileProcessed) {
              setSelectedConvertedFileName(fileName);
              firstFileProcessed = true;
            }
          } else {
            throw new Error(res.data.message || "Unknown backend error");
          }
        } catch (e: unknown) {
          const endTime = Date.now();
          const message = e instanceof Error ? e.message : String(e);
          newConvertedFiles[fileName] = `// Error: ${message}`;
          
          addReport({
            success: false,
            executionTime: endTime - startTime,
            originalCode: fileContent,
            convertedCode: `// Error: ${message}`,
            explanation: `Failed to convert ${fileName}: ${message}`,
            securityIssues: [],
          });
        }
      }
    } 
    // Process pasted code if no files uploaded
    else if (python2Code.trim()) {
      const fileName = "pasted_code.py";
      const startTime = Date.now();
      try {
        const res = await axios.post("http://localhost:5000/migrate", {
          code: python2Code,
        });
        const endTime = Date.now();

        if (res.data.status === "success") {
          newConvertedFiles[fileName] = res.data.result;
          
          addReport({
            success: true,
            executionTime: endTime - startTime,
            originalCode: python2Code,
            convertedCode: res.data.result,
            explanation: res.data.explain || "",
            securityIssues: [],
          });

          setSelectedConvertedFileName(fileName);
          firstFileProcessed = true;
        } else {
          throw new Error(res.data.message || "Unknown backend error");
        }
      } catch (e: unknown) {
        const endTime = Date.now();
        const message = e instanceof Error ? e.message : String(e);
        newConvertedFiles[fileName] = `// Error: ${message}`;
        
        addReport({
          success: false,
          executionTime: endTime - startTime,
          originalCode: python2Code,
          convertedCode: `// Error: ${message}`,
          explanation: `Failed to convert pasted code: ${message}`,
          securityIssues: [],
        });
      }
    }

    setConvertedFiles(newConvertedFiles);
    toast(`${Object.keys(newConvertedFiles).length} file(s) processed.`);
    setIsConverting(false);
  };

  const handleDownload = () => {
    if (!selectedConvertedFileName || !convertedFiles[selectedConvertedFileName]) {
      toast("No converted code to download.", { 
        description: "Please select a converted file." 
      });
      return;
    }
    
    const filename = selectedConvertedFileName.endsWith('.py') 
      ? selectedConvertedFileName.replace('.py', '_converted.py')
      : `${selectedConvertedFileName}_converted.py`;
      
    saveAs(
      new Blob([convertedFiles[selectedConvertedFileName]], { type: "text/x-python;charset=utf-8" }),
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
              {isConverting ? (
                <RotateCcw size={16} className="animate-spin" />
              ) : (
                <Play size={16} />
              )}
              {isConverting ? "Converting..." : "Convert to Python 3"}
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
                onChange={handlePython2CodeChange}
                onScroll={() => handleScroll("left")}
                className="w-full h-full p-4 font-mono text-sm border-0 resize-none focus:outline-none bg-gray-900 text-green-400"
                placeholder="Paste your Python 2 code here or upload a file..."
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />
              {dragOver && (
                <div className="absolute inset-0 bg-blue-500 bg-opacity-20 border-2 border-dashed border-blue-500 flex items-center justify-center">
                  <div className="text-blue-700 font-semibold">
                    Drop Python files here
                  </div>
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
              <div className="p-2 border-t">
                <label
                  htmlFor="file-switcher-py2"
                  className="text-sm text-gray-700 mr-2"
                >
                  View file:
                </label>
                <select
                  id="file-switcher-py2"
                  value={selectedFileName}
                  onChange={(e) => setSelectedFileName(e.target.value)}
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
                onScroll={() => handleScroll("right")}
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
              <div className="p-2 border-t">
                <label
                  htmlFor="file-switcher-py3"
                  className="text-sm text-gray-700 mr-2"
                >
                  View file:
                </label>
                <select
                  id="file-switcher-py3"
                  value={selectedConvertedFileName}
                  onChange={(e) => setSelectedConvertedFileName(e.target.value)}
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
                <div
                  key={fileName}
                  className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg"
                >
                  <FileText className="text-blue-500" size={16} />
                  <span className="text-sm font-medium text-gray-900">
                    {fileName}
                  </span>
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
                  <strong>Translation Summary{selectedConvertedFileName ? ` for ${selectedConvertedFileName}` : ''}:</strong>
                </div>
                <div className="p-4 bg-gray-100 text-gray-800 text-sm rounded-md border border-gray-200 shadow-sm">
                  <pre className="whitespace-pre-wrap">{codeChanges}</pre>
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