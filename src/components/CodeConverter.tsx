
import React, { useState } from 'react';
import { Play, Download, Copy, RotateCcw, FileText } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import axios from "axios"
import { saveAs } from "file-saver";
const CodeConverter: React.FC = () => {
  const location = useLocation();
  const passedCode = location.state?.code || "";
  const passedFileName = location.state?.fileName || "";
  const [python2Code, setPython2Code] = useState(passedCode);

  const [python3Code, setPython3Code] = useState(`Converted code will appear here...`);

  const [isConverting, setIsConverting] = useState(false);

  const [codeChanges, setCodeChanges] = useState("");

  const handleCopy = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code);
    // alert("Copied!");
  } catch (err) {
    console.error("Copy failed:", err);
  }
};

  const handleModernize = async () => {
    if (!python2Code) {
      setPython3Code("// Input Python 2 Code");
      return;
    }
    setPython3Code("// Translating...");
    try {
      const res = await axios.post("http://localhost:5000/migrate", { code: python2Code });
      if (res.data.status === "success") {
        setPython3Code(res.data.result);
        setCodeChanges(res.data.explain);
      } 
      else {
        setPython3Code("// BackendErr: " + (res.data.message || "Unknown Err"));
      }
    } 
    catch (e: any) {
      setPython3Code("// NetworkErr: " + e.message);
    }
  };

  const handleDownload = () => {
  const filename = passedFileName ? `${passedFileName}` : "converted_code.py";
  saveAs(
    new Blob([python3Code], { type: "text/x-python;charset=utf-8" }),
    filename
  );
  };
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Code Converter</h2>
          <div className="flex gap-3">
            <button 
              onClick={handleModernize}
              disabled={isConverting}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isConverting ? <RotateCcw size={16} className="animate-spin" /> : <Play size={16} />}
              {isConverting ? 'Converting...' : 'Convert to Python 3'}
            </button>
            <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              onClick={handleDownload}>
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          {/* Python 2 Input Panel */}
          <div className="bg-white rounded-lg shadow-sm border flex flex-col">
            <div className="p-4 border-b bg-red-50 border-red-200">
              <h3 className="font-semibold text-red-800 flex items-center gap-2">
                <FileText size={16} />
                Python 2 (Legacy)
              </h3>
            </div>
            <div className="flex-1 relative">
              <textarea
                value={python2Code}
                onChange={(e) => setPython2Code(e.target.value)}
                className="w-full h-full p-4 font-mono text-sm border-0 resize-none focus:outline-none bg-gray-900 text-green-400"
                placeholder="Paste your Python 2 code here..."
              />
              <button className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-white" onClick={() => handleCopy(python2Code)}>
                <Copy size={14} />
              </button>
            </div>
          </div>

          {/* Python 3 Output Panel */}
          <div className="bg-white rounded-lg shadow-sm border flex flex-col">
            <div className="p-4 border-b bg-green-50 border-green-200">
              <h3 className="font-semibold text-green-800 flex items-center gap-2">
                <FileText size={16} />
                Python 3 (Converted)
              </h3>
            </div>
            <div className="flex-1 relative">
              <textarea
                value={python3Code}
                readOnly
                className="w-full h-full p-4 font-mono text-sm border-0 resize-none focus:outline-none bg-gray-900 text-blue-400"
                placeholder="Converted code will appear here..."
              />
              <button className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-white" onClick={() => handleCopy(python3Code)}>
                <Copy size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Conversion Summary */}
        <div className="mt-6 bg-white p-4 rounded-lg shadow-sm border">
          <h4 className="font-semibold text-gray-900 mb-3">Conversion Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {codeChanges ? (
              <div className="md:col-span-3">
              <span className="text-gray-600">Changes Made:</span>
              <pre className="mt-2 p-3 bg-gray-100 text-sm rounded whitespace-pre-wrap text-gray-800">
                {codeChanges}
              </pre>
              </div>
            ) : (
              <div className="text-gray-500 italic">Run a conversion to see changes here.</div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeConverter;
