import React, { useRef, useState } from 'react';
import { Upload, Download, Copy, RotateCcw, FileText, FolderOpen, X, Play } from 'lucide-react';
import axios from "axios";
import { saveAs } from "file-saver";
import { toast } from "@/components/ui/sonner";
import { useAppContext } from '@/context/AppContext'; // Import the context hook

const CodeWorkspace: React.FC = () => {
    const [dragOver, setDragOver] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
    const [python2Code, setPython2Code] = useState("");
    const [isConverting, setIsConverting] = useState(false);

    // Use the context for state management
    const { addReport, latestReport } = useAppContext();
    const python3Code = latestReport?.convertedCode ?? "Converted code will appear here...";
    const codeChanges = latestReport?.explanation ?? "";

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const leftPanelRef = useRef<HTMLTextAreaElement | null>(null);
    const rightPanelRef = useRef<HTMLTextAreaElement | null>(null);

    // Scroll sync logic remains the same...
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
    
    const processFile = (file: File) => {
        if (!file.name.toLowerCase().endsWith('.py')) {
          toast('Unsupported file type', { description: 'Only .py files are allowed.' });
          return;
        }
    
        setUploadedFiles(prev => [...prev, file.name]);
        const reader = new FileReader();
        reader.onload = evt => {
          const text = evt.target?.result;
          if (typeof text === 'string') setPython2Code(text);
        };
        reader.onerror = () => console.error('Could not read file:', reader.error);
        reader.readAsText(file);
    }
    
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
          processFile(files[0]);
        }
    };
    
    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const chosenFile = e.target.files?.[0];
        if (chosenFile) {
          processFile(chosenFile);
        }
    };

    const removeFile = (fileName: string) => {
        setUploadedFiles(uploadedFiles.filter(file => file !== fileName));
    };

    const handleCopy = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            toast("Code copied to clipboard!");
        } catch (err) {
            console.error("Copy failed:", err);
            toast("Failed to copy code.", { description: "Please try again." });
        }
    };

    const handleModernize = async () => {
        if (!python2Code) {
            toast("Input code is empty.", { description: "Please paste or upload Python 2 code." });
            return;
        }
        setIsConverting(true);
        const startTime = Date.now();

        try {
            const res = await axios.post("http://localhost:5000/migrate", { code: python2Code });
            const endTime = Date.now();

            if (res.data.status === "success") {
                // TODO: Replace placeholder security issues with real data from backend
                const placeholderSecurityIssues = [
                    { id: '1', file: 'user_auth.py', line: 45, severity: "high" as "high", standard: 'HIPAA' as "HIPAA", title: 'Hardcoded Password', description: 'Password stored as plain text in code violates HIPAA security requirements.', recommendation: 'Use environment variables or secure key management system.', code: 'password = "admin123"  # Flagged line' },
                ];

                addReport({
                    success: true,
                    executionTime: endTime - startTime,
                    originalCode: python2Code,
                    convertedCode: res.data.result,
                    explanation: res.data.explain,
                    securityIssues: placeholderSecurityIssues,
                });
                toast("Conversion successful!", { description: `Completed in ${(endTime - startTime) / 1000}s.` });
            } else {
                throw new Error(res.data.message || "An unknown backend error occurred.");
            }
        } catch (e: unknown) {
            const endTime = Date.now();
            const message = e instanceof Error ? e.message : String(e);
            addReport({
                success: false,
                executionTime: endTime - startTime,
                originalCode: python2Code,
                convertedCode: `// Error during conversion: ${message}`,
                explanation: "The conversion failed. Please check the console for more details and ensure your backend server is running.",
                securityIssues: [],
            });
            toast("Conversion Failed", { description: message });
        } finally {
            setIsConverting(false);
        }
    };

    const handleDownload = () => {
        if (!latestReport || !latestReport.success) {
            toast("No code to download.", { description: "Please convert some code first." });
            return;
        }
        const filename = uploadedFiles.length > 0 ? `${uploadedFiles[0].replace('.py', '_converted.py')}` : "converted_code.py";
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
                    </div>
                </div>

                {/* Uploaded Files Section */}
                {uploadedFiles.length > 0 && (
                    <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Uploaded Files</h4>
                        <div className="flex flex-wrap gap-2">
                            {uploadedFiles.map((fileName) => (
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
                                <pre className="p-3 bg-gray-100 text-sm rounded whitespace-pre-wrap text-gray-800 border">
                                    {codeChanges}
                                </pre>
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