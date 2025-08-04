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
  ChevronLeft,
  AlertTriangle,
  Shield,
  AlertCircle,
  FileCode,
} from "lucide-react";
import axios from "axios";
import { saveAs } from "file-saver";
import { toast } from "@/components/ui/sonner";
import { useAppContext, SecurityIssue } from '@/context/AppContext';
import { useLocation, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const BACKEND_URL = "http://localhost:5000";
  const [dragOver, setDragOver] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const passedCode = location.state?.code || "";
  const githubFiles = location.state?.files || null;
  const githubDefaultFile = location.state?.defaultFile || "";

  // Get context
  const { addReport, latestReport, workspaceState, updateWorkspaceState, apiConnectivity } = useAppContext();

  // Initialize state from context or defaults
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>(workspaceState.uploadedFiles);
  const [convertedFiles, setConvertedFiles] = useState<Record<string, string>>(workspaceState.convertedFiles);
  const [selectedFileName, setSelectedFileName] = useState<string>(workspaceState.selectedFileName);
  const [isConverting, setIsConverting] = useState(false);

  // GitHub integration state
  const [githubUrl, setGithubUrl] = useState("");
  const [githubFileTree, setGithubFileTree] = useState<GitHubFile[]>([]);
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);
  const [githubModalOpenPython2, setGithubModalOpenPython2] = useState(false);
  const [githubModalOpenPython3, setGithubModalOpenPython3] = useState(false);
  const [repoLoadFailed, setRepoLoadFailed] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [targetPath, setTargetPath] = useState(`converted/${selectedFileName.replace(/\.py$/, "_converted.py")}`);
  const [repoInput, setRepoInput] = useState(""); // stores user input like 'username/repo'

  // File sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const python2Code = selectedFileName ? uploadedFiles[selectedFileName] || "" : passedCode;
  const python3Code = selectedFileName && convertedFiles[selectedFileName]
    ? convertedFiles[selectedFileName]
    : "Converted code will appear here...";
  const codeChanges = latestReport?.explanation ?? "";

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const leftPanelRef = useRef<HTMLTextAreaElement | null>(null);
  const rightPanelRef = useRef<HTMLTextAreaElement | null>(null);

  // Update context whenever state changes
  useEffect(() => {
    updateWorkspaceState({
      uploadedFiles,
      convertedFiles,
      selectedFileName,
    });
  }, [uploadedFiles, convertedFiles, selectedFileName]);

  // Handle initial state from navigation or persisted state
  useEffect(() => {
    // If coming from navigation with new data
    if (githubFiles && Object.keys(githubFiles).length > 0) {
      setUploadedFiles(githubFiles);
      setSelectedFileName(githubDefaultFile || Object.keys(githubFiles)[0]);
      updateWorkspaceState({
        githubFiles,
        githubDefaultFile,
      });
    } 
    // If there's passed code and no existing files
    else if (passedCode && Object.keys(uploadedFiles).length === 0 && !selectedFileName) {
      const initialFileName = "pasted_code.py";
      setUploadedFiles({ [initialFileName]: passedCode });
      setSelectedFileName(initialFileName);
    }
    // If returning to the workspace with existing state
    else if (workspaceState.uploadedFiles && Object.keys(workspaceState.uploadedFiles).length > 0) {
      setUploadedFiles(workspaceState.uploadedFiles);
      setConvertedFiles(workspaceState.convertedFiles);
      setSelectedFileName(workspaceState.selectedFileName);
    }
  }, []);

  const handlePython2CodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    
    if (selectedFileName) {
      setUploadedFiles(prev => ({
        ...prev,
        [selectedFileName]: newCode,
      }));
    } else {
      const newFileName = "new_file.py";
      setUploadedFiles({ [newFileName]: newCode });
      setSelectedFileName(newFileName);
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
    // Check API connectivity before attempting conversion
    if (!apiConnectivity.isConnected || !apiConnectivity.openaiConfigured) {
      toast("API not connected", { 
        description: "Please configure your OpenAI API key in Settings first.",
        action: {
          label: "Go to Settings",
          onClick: () => navigate("/settings")
        }
      });
      return;
    }
    setIsConverting(true);
    const newConvertedFiles: Record<string, string> = {};
    let totalSecurityIssues: SecurityIssue[] = [];
    
    for (const [fileName, fileContent] of Object.entries(uploadedFiles)) {
      const startTime = Date.now();
      try {
        const res = await axios.post(`${BACKEND_URL}/migrate`, { 
          code: fileContent,
          filename: fileName 
        });
        const endTime = Date.now();
        
        newConvertedFiles[fileName] = res.data.result || "";
        
        // Process security issues
        const securityIssues: SecurityIssue[] = res.data.security_issues || [];
        totalSecurityIssues = [...totalSecurityIssues, ...securityIssues];
        
        addReport({
          success: true,
          executionTime: endTime - startTime,
          originalCode: fileContent,
          convertedCode: res.data.result,
          explanation: res.data.explain || "",
          securityIssues: securityIssues,
        });
        
        // If there are security issues, show a notification
        if (securityIssues.length > 0) {
          const highSeverityCount = securityIssues.filter(i => i.severity === 'high').length;
          const message = highSeverityCount > 0 
            ? `Found ${securityIssues.length} security issues (${highSeverityCount} high severity)`
            : `Found ${securityIssues.length} security issues`;
            
          toast(message, { 
            description: "Click on Security Scan to view details",
            action: {
              label: "View",
              onClick: () => navigate("/security")
            }
          });
        }
      } catch (e) {
        const endTime = Date.now();
        let message = e instanceof Error ? e.message : String(e);
        
        // Extract more meaningful error message from axios errors
        if (e && typeof e === 'object' && 'response' in e) {
          const axiosError = e as any;
          if (axiosError.response?.data?.message) {
            message = axiosError.response.data.message;
          } else if (axiosError.response?.status === 500) {
            message = `Server error (500): ${message}. Please check if your Python code has syntax errors.`;
          }
        }
        
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
    
    const successCount = Object.keys(newConvertedFiles).filter(
      key => !newConvertedFiles[key].startsWith('// Error:')
    ).length;
    
    toast(`${successCount}/${Object.keys(newConvertedFiles).length} file(s) converted successfully.`);
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

  // Clear workspace state
  const handleClearWorkspace = () => {
    setUploadedFiles({});
    setConvertedFiles({});
    setSelectedFileName("");
    updateWorkspaceState({
      uploadedFiles: {},
      convertedFiles: {},
      selectedFileName: "",
      githubFiles: null,
      githubDefaultFile: "",
    });
    toast("Workspace cleared");
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
        const res = await axios.get(url, {
        headers: accessToken ? { Authorization: `token ${accessToken}` } : {},
        });
        
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
            const fileRes = await axios.get(item.url, {
            headers: accessToken ? { Authorization: `token ${accessToken}` } : {},
            });
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
      setRepoLoadFailed(true);
      toast("Failed to load repository", { 
        description: "Please check the URL or authenticate with GitHub" 
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
    setGithubModalOpenPython2(false);
    toast(`Imported ${Object.keys(selectedFiles).length} file(s)`);
  };

  const fetchRepos = async (token: string) => {
      const res = await axios.get("https://api.github.com/user/repos", {
        headers: { Authorization: `token ${token}` },
      });
      setRepos(res.data);
  };

  const handleLogin = () => {
    window.open(`${BACKEND_URL}/github/login`, "_blank", "width=600,height=700");
  };

  useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "github_token" && event.data?.token) {
          setAccessToken(event.data.token);
          fetchRepos(event.data.token);
        }
      };
      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }, []);

  // Get security issues for a specific file
  const getFileSecurityIssues = (fileName: string): SecurityIssue[] => {
    if (!latestReport) return [];
    return latestReport.securityIssues.filter(issue => issue.file === fileName);
  };

  // Get highest severity for a file
  const getFileHighestSeverity = (fileName: string): 'high' | 'medium' | 'low' | null => {
    const issues = getFileSecurityIssues(fileName);
    if (issues.length === 0) return null;
    
    if (issues.some(issue => issue.severity === 'high')) return 'high';
    if (issues.some(issue => issue.severity === 'medium')) return 'medium';
    return 'low';
  };

  // Render the file sidebar
  const renderFileSidebar = () => {
    const fileNames = Object.keys(uploadedFiles);
    if (fileNames.length <= 1) return null;

    return (
      <div className={`bg-white border-r transition-all duration-300 ${sidebarCollapsed ? 'w-12' : 'w-64'} flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
          {!sidebarCollapsed && (
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Folder size={16} />
              Files ({fileNames.length})
            </h3>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 hover:bg-gray-200 rounded text-gray-600"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto">
          {fileNames.map((fileName) => {
            const isActive = fileName === selectedFileName;
            const hasConverted = fileName in convertedFiles;
            const severity = getFileHighestSeverity(fileName);
            const issuesCount = getFileSecurityIssues(fileName).length;

            return (
              <div
                key={fileName}
                onClick={() => setSelectedFileName(fileName)}
                className={`p-3 cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${
                  isActive ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                } ${sidebarCollapsed ? 'px-2' : ''}`}
                title={sidebarCollapsed ? fileName : ''}
              >
                <div className="flex items-center gap-2">
                  {/* File icon */}
                  <div className="flex-shrink-0">
                    <FileCode 
                      size={16} 
                      className={`${fileName.endsWith('.py') ? 'text-blue-600' : 'text-gray-500'}`}
                    />
                  </div>

                  {/* File name (hidden when collapsed) */}
                  {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {fileName}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {/* Conversion status */}
                        {hasConverted && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <Shield size={10} />
                            Converted
                          </span>
                        )}
                        
                        {/* Security indicators */}
                        {severity && (
                          <div className="flex items-center gap-1">
                            {severity === 'high' && (
                              <div className="flex items-center gap-1 text-xs text-red-600">
                                <AlertTriangle size={10} />
                                <span>{issuesCount} high</span>
                              </div>
                            )}
                            {severity === 'medium' && !getFileSecurityIssues(fileName).some(i => i.severity === 'high') && (
                              <div className="flex items-center gap-1 text-xs text-orange-600">
                                <AlertCircle size={10} />
                                <span>{issuesCount} med</span>
                              </div>
                            )}
                            {severity === 'low' && !getFileSecurityIssues(fileName).some(i => i.severity === 'high' || i.severity === 'medium') && (
                              <div className="flex items-center gap-1 text-xs text-yellow-600">
                                <AlertCircle size={10} />
                                <span>{issuesCount} low</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Indicators when collapsed */}
                  {sidebarCollapsed && (
                    <div className="flex flex-col items-center gap-1">
                      {hasConverted && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" title="Converted" />
                      )}
                      {severity && (
                        <div className={`w-2 h-2 rounded-full ${
                          severity === 'high' ? 'bg-red-500' : 
                          severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
                        }`} title={`${issuesCount} ${severity} severity issues`} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
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

  const handlePushToGitHub = async () => {
    if (!accessToken) {
      toast("Please authenticate with GitHub first.");
      return;
    }

    if (!repoInput.trim()) {
      toast("Please enter a repository name.");
      return;
    }

    const parsed = parseGitHubUrl(`https://github.com/${repoInput}`);
    if (!parsed) {
      toast("Invalid repository format");
      return;
    }

    const normalizedFolder = targetPath.replace(/\/+$/, "");

    try {
      await axios.post(`${BACKEND_URL}/github/commit`, {
       token: accessToken,
        repo: `${parsed.owner}/${parsed.repo}`,
        message: commitMessage || `Add converted files to ${normalizedFolder}/`,
        files: Object.entries(convertedFiles).map(([fileName, fileContent]) => ({
          path: `${normalizedFolder}/${fileName.replace(/\.py$/, "_converted.py")}`,
          content: fileContent
        }))
      });
      toast("Successfully pushed to GitHub!");
      setGithubModalOpenPython3(false);
    
    } catch (err) {
      console.error(err);
      toast("Failed to push to GitHub", {
        description: "Check repository permissions or path.",
      });
    }
  };




  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Code Workspace</h2>
          <div className="flex gap-2">
            <button
              onClick={handleClearWorkspace}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center gap-2"
              title="Clear workspace"
            >
              <X size={16} />
              Clear
            </button>
            <button
              onClick={handleModernize}
              disabled={isConverting || !apiConnectivity.isConnected || !apiConnectivity.openaiConfigured}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!apiConnectivity.isConnected || !apiConnectivity.openaiConfigured ? "API not connected. Please configure your OpenAI API key in Settings." : ""}
            >
              {isConverting ? <RotateCcw size={16} className="animate-spin" /> : <Play size={16} />}
              {isConverting ? "Converting..." : "Convert to Python 3"}
            </button>
            {(!apiConnectivity.isConnected || !apiConnectivity.openaiConfigured) && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-700 text-sm">
                  <AlertCircle size={16} />
                  <span>API not connected. Please configure your OpenAI API key in Settings.</span>
                  <button 
                    onClick={() => navigate("/settings")}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Go to Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security Alert Banner */}
        {latestReport && latestReport.securityIssues.length > 0 && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 p-2 rounded-full">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-yellow-800">Security Issues Detected</h4>
                <p className="text-sm text-yellow-700">
                  {latestReport.securityIssues.length} issue(s) found in the converted code
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/security")}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md text-sm hover:bg-yellow-700"
            >
              View Details
            </button>
          </div>
        )}

        <div className="flex gap-6 h-[60vh]">
          {/* File Sidebar */}
          {renderFileSidebar()}

          {/* Main Content Area */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border flex flex-col">
            <div className="p-4 border-b bg-red-50 border-red-200 flex items-center justify-between">
              <h3 className="font-semibold text-red-800 flex items-center gap-2">
                <FileText size={16} /> Python 2 (Legacy)
              </h3>
              <div className="flex gap-2">
                <Dialog open={githubModalOpenPython2} onOpenChange={setGithubModalOpenPython2}>
                  <DialogTrigger asChild>
                    <button className="bg-gray-800 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 flex items-center gap-1">
                      <Github size={12} /> GitHub
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Import from GitHub</DialogTitle>
                      <DialogDescription>
                        Enter a GitHub repository URL to browse and select Python files
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
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
                        {repoLoadFailed && (
                          <button
                            onClick={() => {
                              handleLogin()
                              setRepoLoadFailed(false);
                            }}
                            className="ml-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                          >
                            Authenticate
                          </button>
                        )}
                      </div>

                      {githubFileTree.length > 0 && (
                        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                          <div className="border rounded-md p-4 flex-1 overflow-y-auto">
                            <div className="text-sm font-medium mb-2">Repository Structure</div>
                            {renderFileTree(githubFileTree)}
                          </div>
                          <div className="flex justify-between pt-4 border-t">
                            <DialogClose asChild>
                              <button className="px-4 py-2 border rounded-md text-sm hover:bg-muted">
                                Cancel
                              </button>
                            </DialogClose>
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
                  </DialogContent>
                </Dialog>
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
              <div className="flex gap-2"> 
                <Dialog open={githubModalOpenPython3} onOpenChange={setGithubModalOpenPython3}>
                  <DialogTrigger asChild>
                    <button className="bg-gray-800 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 flex items-center gap-1">
                      <Github size={12} /> GitHub
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Export Converted File to GitHub</DialogTitle>
                      <DialogDescription> Push the converted code to a repository of your choice. </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Repository (e.g. user/repo)</label>
                        <input
                          type="text"
                          value={repoInput}
                          onChange={(e) => setRepoInput(e.target.value)}
                          placeholder="username/repo"
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Path in Repo</label>
                        <input
                          type="text"
                          value={targetPath}
                          onChange={(e) => setTargetPath(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Commit Message</label>
                        <input
                          type="text"
                          value={commitMessage}
                          onChange={(e) => setCommitMessage(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        />
                      </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <DialogClose asChild>
                    <button className="px-4 py-2 border rounded-md text-sm hover:bg-muted">
                      Cancel
                    </button>
                  </DialogClose>
                  <button
                    onClick={() => {
                      handleLogin()
                      setRepoLoadFailed(false);
                      }}
                    className="ml-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                  >
                    Authenticate
                  </button>
                  <button
                    onClick={handlePushToGitHub}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                  >
                    Push to GitHub
                  </button>
                  </div>
                </DialogContent>

                </Dialog>
              
              <button onClick={handleDownload} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1">
                <Download size={12} /> Download
              </button>
              </div>
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
        </div>


        {/* Change Explanation Panel */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Conversion Summary
            </h4>
          </div>
          <div className="p-6">
            {codeChanges ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-1 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Changes applied to {selectedFileName}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
                  <div className="pl-6 space-y-3">
                    {(() => {
                      const lines = codeChanges.split('\n').filter(line => line.trim());
                      const processedContent: React.ReactNode[] = [];
                      let currentSection: { header: string; items: string[] } | null = null;

                      const renderInlineMarkdown = (text: string): React.ReactNode => {
                        // Replace **text** with bold
                        let processed = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                        // Replace `code` with inline code
                        processed = processed.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-mono">$1</code>');
                        
                        return <span dangerouslySetInnerHTML={{ __html: processed }} />;
                      };

                      lines.forEach((line, index) => {
                        const trimmedLine = line.trim();
                        
                        // Check if it's a header (ends with ** and starts with **)
                        if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && trimmedLine.match(/\*\*/g)?.length === 2) {
                          // Save previous section if exists
                          if (currentSection && currentSection.items.length > 0) {
                            processedContent.push(
                              <div key={`section-${processedContent.length}`} className="mb-4">
                                <h5 className="text-sm font-semibold text-gray-900 mb-2">
                                  {currentSection.header}
                                </h5>
                                <div className="space-y-2 ml-4">
                                  {currentSection.items.map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                      <div className="mt-1.5 flex-shrink-0">
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                                      </div>
                                      <p className="text-sm text-gray-700 leading-relaxed flex-1">
                                        {renderInlineMarkdown(item)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          
                          // Start new section
                          const headerText = trimmedLine.replace(/\*\*/g, '').trim();
                          currentSection = { header: headerText, items: [] };
                        }
                        // Check if it's a main bullet point (starts with * or -)
                        else if (trimmedLine.startsWith('*') || trimmedLine.startsWith('-')) {
                          const content = trimmedLine.substring(1).trim();
                          
                          // If we're in a section, add as sub-item
                          if (currentSection) {
                            currentSection.items.push(content);
                          } else {
                            // Otherwise, add as main bullet point
                            processedContent.push(
                              <div key={`bullet-${index}`} className="flex items-start gap-3 group">
                                <div className="mt-1.5 flex-shrink-0">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:ring-4 group-hover:ring-blue-100 transition-all"></div>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed flex-1">
                                  {renderInlineMarkdown(content)}
                                </p>
                              </div>
                            );
                          }
                        }
                        // Check if it's a sub-item (starts with spaces/tabs)
                        else if (currentSection && (line.startsWith('  ') || line.startsWith('\t'))) {
                          currentSection.items.push(trimmedLine);
                        }
                        // Regular text or unformatted content
                        else if (trimmedLine) {
                          // Close current section if exists
                          if (currentSection && currentSection.items.length > 0) {
                            processedContent.push(
                              <div key={`section-${processedContent.length}`} className="mb-4">
                                <h5 className="text-sm font-semibold text-gray-900 mb-2">
                                  {currentSection.header}
                                </h5>
                                <div className="space-y-2 ml-4">
                                  {currentSection.items.map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                      <div className="mt-1.5 flex-shrink-0">
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                                      </div>
                                      <p className="text-sm text-gray-700 leading-relaxed flex-1">
                                        {renderInlineMarkdown(item)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                            currentSection = null;
                          }
                          
                          // Add as regular paragraph
                          processedContent.push(
                            <p key={`para-${index}`} className="text-sm text-gray-600 leading-relaxed">
                              {renderInlineMarkdown(trimmedLine)}
                            </p>
                          );
                        }
                      });

                      // Don't forget to add the last section if it exists
                      if (currentSection && currentSection.items.length > 0) {
                        processedContent.push(
                          <div key={`section-${processedContent.length}`} className="mb-4">
                            <h5 className="text-sm font-semibold text-gray-900 mb-2">
                              {currentSection.header}
                            </h5>
                            <div className="space-y-2 ml-4">
                              {currentSection.items.map((item, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <div className="mt-1.5 flex-shrink-0">
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                                  </div>
                                  <p className="text-sm text-gray-700 leading-relaxed flex-1">
                                    {renderInlineMarkdown(item)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      return processedContent;
                    })()}
                  </div>
                </div>
                
                {/* Success indicator */}
                <div className="mt-6 flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">Conversion completed successfully</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-500 text-sm">
                  No conversion summary available yet
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Run a conversion to see detailed changes here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeWorkspace;