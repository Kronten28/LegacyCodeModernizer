import React, { useRef, useState, useEffect } from "react";
import {
  Download,
  Copy,
  RotateCcw,
  FileText,
  FolderOpen,
  X,
  Play,
  Github,
  Folder,
  File,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import axios from "axios";
import { saveAs } from "file-saver";
import { toast } from "@/components/ui/sonner";
import { useAppContext } from '@/context/AppContext';
import { useLocation } from "react-router-dom";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  content?: string;
  children?: GitHubFile[];
  selected?: boolean;
  expanded?: boolean;
}

const CodeWorkspace: React.FC = () => {
  const [dragOver, setDragOver] = useState(false);
  const location = useLocation();
  const passedCode = location.state?.code || "";
  const githubFiles = location.state?.files || null;
  const githubDefaultFile = location.state?.defaultFile || "";

  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});
  const [convertedFiles, setConvertedFiles] = useState<Record<string, string>>({});
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [isConverting, setIsConverting] = useState(false);

  // GitHub integration state
  const [githubUrl, setGithubUrl] = useState("");
  const [githubFileTree, setGithubFileTree] = useState<GitHubFile[]>([]);
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);
  const [githubDrawerOpen, setGithubDrawerOpen] = useState(false);

  const { addReport, latestReport } = useAppContext();

  const python2Code = selectedFileName ? uploadedFiles[selectedFileName] || "" : passedCode;
  const python3Code = selectedFileName && convertedFiles[selectedFileName]
    ? convertedFiles[selectedFileName]
    : "Converted code will appear here...";
  const codeChanges = latestReport?.explanation ?? "";

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const leftPanelRef = useRef<HTMLTextAreaElement | null>(null);
  const rightPanelRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (githubFiles && Object.keys(githubFiles).length > 0) {
      setUploadedFiles(githubFiles);
      setSelectedFileName(githubDefaultFile || Object.keys(githubFiles)[0]);
    } 
    else if (passedCode && Object.keys(uploadedFiles).length === 0 && !selectedFileName) {
      const initialFileName = "pasted_code.py";
      setUploadedFiles({ [initialFileName]: passedCode });
      setSelectedFileName(initialFileName);
    }
  }, []);

  const handlePython2CodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    if (selectedFileName) {
      setUploadedFiles(prev => ({
        ...prev,
        [selectedFileName]: newCode,
      }));
    }
  };

  const handleScroll = (source: "left" | "right") => {
    if (!leftPanelRef.current || !rightPanelRef.current) return;
    const sourceRef = source === "left" ? leftPanelRef.current : rightPanelRef.current;
    const targetRef = source === "left" ? rightPanelRef.current : leftPanelRef.current;
    const scrollPercentage = sourceRef.scrollTop / (sourceRef.scrollHeight - sourceRef.clientHeight);
    targetRef.scrollTop = scrollPercentage * (targetRef.scrollHeight - targetRef.clientHeight);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.py')) {
      toast('Unsupported file type', { description: 'Only .py files are allowed.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result;
      if (typeof text === "string") {
        setUploadedFiles(prev => {
          const merged = { ...prev, [file.name]: text };
          if (!selectedFileName || Object.keys(prev).length === 0) {
            setSelectedFileName(file.name);
          }
          return merged;
        });
      }
    };
    reader.onerror = () => console.error("Could not read file:", reader.error);
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.filter(f => f.name.endsWith(".py")).forEach(processFile);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) Array.from(files).forEach(processFile);
    e.target.value = "";
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast("Code copied to clipboard!");
    } catch {
      toast("Failed to copy code.", { description: "Please try again." });
    }
  };

  const handleModernize = async () => {
    if (Object.keys(uploadedFiles).length === 0 && !python2Code.trim()) {
      toast("No code to convert.", { description: "Please upload or paste code." });
      return;
    }
    setIsConverting(true);
    const newConvertedFiles: Record<string, string> = {};
    for (const [fileName, fileContent] of Object.entries(uploadedFiles)) {
      const startTime = Date.now();
      try {
        const res = await axios.post("http://localhost:5000/migrate", { code: fileContent });
        const endTime = Date.now();
        newConvertedFiles[fileName] = res.data.result || "";
        addReport({
          success: true,
          executionTime: endTime - startTime,
          originalCode: fileContent,
          convertedCode: res.data.result,
          explanation: res.data.explain || "",
          securityIssues: [],
        });
      } catch (e) {
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
    setConvertedFiles(newConvertedFiles);
    setIsConverting(false);
    toast(`${Object.keys(newConvertedFiles).length} file(s) processed.`);
  };

  const handleDownload = () => {
    const converted = convertedFiles[selectedFileName];
    if (!converted) {
      toast("No converted code to download.", { description: "Please select a file." });
      return;
    }
    const filename = selectedFileName.replace(/\.py$/, "_converted.py");
    saveAs(new Blob([converted], { type: "text/x-python;charset=utf-8" }), filename);
  };

  // GitHub integration methods
  const parseGitHubUrl = (url: string): { owner: string; repo: string } | null => {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)(\/|$)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
  };

  const fetchGitHubRepo = async () => {
    if (!githubUrl.trim()) {
      toast("Please enter a GitHub URL");
      return;
    }

    const parsed = parseGitHubUrl(githubUrl);
    if (!parsed) {
      toast("Invalid GitHub URL");
      return;
    }

    setIsLoadingRepo(true);
    const { owner, repo } = parsed;

    try {
      const buildFileTree = async (path = ""): Promise<GitHubFile[]> => {
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        const res = await axios.get(url);
        
        const files: GitHubFile[] = [];
        for (const item of res.data) {
          const file: GitHubFile = {
            name: item.name,
            path: item.path,
            type: item.type,
            selected: false,
            expanded: false,
          };

          if (item.type === "dir") {
            file.children = await buildFileTree(item.path);
          } else if (item.name.endsWith(".py")) {
            // Fetch content for Python files
            const fileRes = await axios.get(item.url);
            file.content = atob(fileRes.data.content);
          }

          files.push(file);
        }
        return files;
      };

      const files = await buildFileTree();
      setGithubFileTree(files);
      toast("Repository loaded successfully!");
    } catch (error) {
      console.error("Failed to fetch repository:", error);
      toast("Failed to load repository", { 
        description: "Please check the URL and try again." 
      });
    } finally {
      setIsLoadingRepo(false);
    }
  };

  const toggleFileSelection = (path: string) => {
    const updateSelection = (files: GitHubFile[]): GitHubFile[] => {
      return files.map(file => {
        if (file.path === path) {
          return { ...file, selected: !file.selected };
        }
        if (file.children) {
          return { ...file, children: updateSelection(file.children) };
        }
        return file;
      });
    };
    setGithubFileTree(updateSelection(githubFileTree));
  };

  const toggleFolderExpansion = (path: string) => {
    const updateExpansion = (files: GitHubFile[]): GitHubFile[] => {
      return files.map(file => {
        if (file.path === path && file.type === 'dir') {
          return { ...file, expanded: !file.expanded };
        }
        if (file.children) {
          return { ...file, children: updateExpansion(file.children) };
        }
        return file;
      });
    };
    setGithubFileTree(updateExpansion(githubFileTree));
  };

  const importSelectedFiles = () => {
    const getSelectedFiles = (files: GitHubFile[]): Record<string, string> => {
      let selected: Record<string, string> = {};
      for (const file of files) {
        if (file.selected && file.type === 'file' && file.content) {
          selected[file.name] = file.content;
        }
        if (file.children) {
          selected = { ...selected, ...getSelectedFiles(file.children) };
        }
      }
      return selected;
    };

    const selectedFiles = getSelectedFiles(githubFileTree);
    if (Object.keys(selectedFiles).length === 0) {
      toast("No files selected", { description: "Please select Python files to import." });
      return;
    }

    setUploadedFiles(prev => ({ ...prev, ...selectedFiles }));
    if (!selectedFileName) {
      setSelectedFileName(Object.keys(selectedFiles)[0]);
    }
    setGithubDrawerOpen(false);
    toast(`Imported ${Object.keys(selectedFiles).length} file(s)`);
  };

  const renderFileTree = (files: GitHubFile[], depth = 0): React.ReactNode => {
    return files.map(file => (
      <div key={file.path} style={{ marginLeft: `${depth * 16}px` }}>
        <div className="flex items-center py-1 hover:bg-muted/50 rounded px-2">
          {file.type === 'dir' ? (
            <>
              <button
                onClick={() => toggleFolderExpansion(file.path)}
                className="mr-1 p-1 hover:bg-muted rounded"
              >
                {file.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              <Folder size={16} className="mr-2 text-blue-500" />
              <span className="text-sm">{file.name}</span>
            </>
          ) : (
            <>
              <div className="w-6"></div>
              {file.name.endsWith('.py') && (
                <input
                  type="checkbox"
                  checked={file.selected || false}
                  onChange={() => toggleFileSelection(file.path)}
                  className="mr-2"
                />
              )}
              <File size={16} className="mr-2 text-gray-500" />
              <span className="text-sm">{file.name}</span>
            </>
          )}
        </div>
        {file.type === 'dir' && file.expanded && file.children && (
          <div>
            {renderFileTree(file.children, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Code Workspace</h2>
          <button
            onClick={handleModernize}
            disabled={isConverting}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            {isConverting ? <RotateCcw size={16} className="animate-spin" /> : <Play size={16} />}
            {isConverting ? "Converting..." : "Convert to Python 3"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[60vh]">
          <div className="bg-white rounded-lg shadow-sm border flex flex-col">
            <div className="p-4 border-b bg-red-50 border-red-200 flex items-center justify-between">
              <h3 className="font-semibold text-red-800 flex items-center gap-2">
                <FileText size={16} /> Python 2 (Legacy)
              </h3>
              <div className="flex gap-2">
                <Drawer open={githubDrawerOpen} onOpenChange={setGithubDrawerOpen}>
                  <DrawerTrigger asChild>
                    <button className="bg-gray-800 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 flex items-center gap-1">
                      <Github size={12} /> GitHub
                    </button>
                  </DrawerTrigger>
                  <DrawerContent className="max-h-[80vh]">
                    <DrawerHeader>
                      <DrawerTitle>Import from GitHub</DrawerTitle>
                      <DrawerDescription>
                        Enter a GitHub repository URL to browse and select Python files
                      </DrawerDescription>
                    </DrawerHeader>
                    <div className="p-4 space-y-4">
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder="https://github.com/username/repository"
                            value={githubUrl}
                            onChange={(e) => setGithubUrl(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                          {githubUrl && (
                            <button
                              onClick={() => setGithubUrl("")}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                        <button
                          onClick={fetchGitHubRepo}
                          disabled={isLoadingRepo}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isLoadingRepo ? <RotateCcw size={16} className="animate-spin" /> : "Load"}
                        </button>
                      </div>

                      {githubFileTree.length > 0 && (
                        <div className="space-y-4">
                          <div className="border rounded-md p-4 max-h-64 overflow-y-auto">
                            <div className="text-sm font-medium mb-2">Repository Structure</div>
                            {renderFileTree(githubFileTree)}
                          </div>
                          <div className="flex justify-between">
                            <DrawerClose asChild>
                              <button className="px-4 py-2 border rounded-md text-sm hover:bg-muted">
                                Cancel
                              </button>
                            </DrawerClose>
                            <button
                              onClick={importSelectedFiles}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                            >
                              Import Selected Files
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </DrawerContent>
                </Drawer>
                <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center gap-1">
                  <FolderOpen size={12} /> Upload
                </button>
                <input ref={fileInputRef} type="file" style={{ display: "none" }} accept=".py" onChange={handleUpload} multiple />
              </div>
            </div>
            <div className="flex-1 relative">
              <textarea
                ref={leftPanelRef}
                value={python2Code}
                onChange={handlePython2CodeChange}
                onScroll={() => handleScroll("left")}
                className="w-full h-full p-4 font-mono text-sm bg-gray-900 text-green-400"
                placeholder="Paste or upload Python 2 code..."
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />
              {dragOver && (
                <div className="absolute inset-0 bg-blue-500 bg-opacity-20 border-2 border-dashed border-blue-500 flex items-center justify-center">
                  <div className="text-blue-700 font-semibold">Drop Python files here</div>
                </div>
              )}
              <button onClick={() => handleCopy(python2Code)} className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-white">
                <Copy size={14} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border flex flex-col">
            <div className="p-4 border-b bg-green-50 border-green-200 flex items-center justify-between">
              <h3 className="font-semibold text-green-800 flex items-center gap-2">
                <FileText size={16} /> Python 3 (Converted)
              </h3>
              <button onClick={handleDownload} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1">
                <Download size={12} /> Download
              </button>
            </div>
            <div className="flex-1 relative">
              <textarea
                ref={rightPanelRef}
                value={python3Code}
                readOnly
                onScroll={() => handleScroll("right")}
                className="w-full h-full p-4 font-mono text-sm bg-gray-900 text-blue-400"
                placeholder="Converted code will appear here..."
              />
              <button onClick={() => handleCopy(python3Code)} className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-white">
                <Copy size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Unified File Dropdown */}
        {Object.keys(uploadedFiles).length > 1 && (
          <div className="flex justify-center mt-4">
            <label htmlFor="file-switcher" className="mr-2 text-sm font-medium text-gray-700">View file:</label>
            <select
              id="file-switcher"
              value={selectedFileName}
              onChange={(e) => setSelectedFileName(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              {Object.keys(uploadedFiles).map(fileName => (
                <option key={fileName} value={fileName}>{fileName}</option>
              ))}
            </select>
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
                  <strong>Translation Summary for {selectedFileName}:</strong>
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
