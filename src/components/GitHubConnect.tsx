import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
const BACKEND_URL = "http://localhost:5000";

const GitHubConnect: React.FC = () => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [repoUrl, setRepoUrl] = useState("");
  const [pythonFiles, setPythonFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const navigate = useNavigate();
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

  const handleLogin = () => {
    window.open(`${BACKEND_URL}/github/login`, "_blank", "width=600,height=700");
  };

  const fetchRepos = async (token: string) => {
    const res = await axios.get("https://api.github.com/user/repos", {
      headers: { Authorization: `token ${token}` },
    });
    setRepos(res.data);
  };

  const parseGitHubUrl = (url: string): { owner: string; repo: string } | null => {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)(\/|$)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
  };

  const fetchPythonFiles = async () => {
    if (!accessToken) return;

    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      alert("Invalid GitHub URL");
      return;
    }

    const { owner, repo } = parsed;
    const result: string[] = [];

    const traverse = async (path = "") => {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      const res = await axios.get(url, {
        headers: { Authorization: `token ${accessToken}` },
      });

      for (const item of res.data) {
        if (item.type === "dir") {
          await traverse(item.path);
        } else if (item.type === "file" && item.name.endsWith(".py")) {
          result.push(item.path);
        }
      }
    };

    try {
      await traverse();
      setPythonFiles(result);
      setSelectedFile(result[0] || null); // auto-select first file
    } catch (err) {
      console.error(err);
      alert("Failed to load files");
    }
  };

  const fetchFileContent = async (path: string) => {
    if (!accessToken || !repoUrl) return;

    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) return;

    const { owner, repo } = parsed;

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    try {
      const res = await axios.get(url, {
        headers: { Authorization: `token ${accessToken}` },
      });

      const content = atob(res.data.content);
      setFileContent(content);
    } catch (err) {
      console.error(err);
      setFileContent("Error loading file.");
    }
  };

  // Load file content when selection changes
  useEffect(() => {
    if (selectedFile) {
      fetchFileContent(selectedFile);
    }
  }, [selectedFile]);

   

  return (
    <div className="space-y-6">
      {!accessToken ? (
        <button onClick={handleLogin} className="px-4 py-2 bg-black text-white rounded-lg">
          Connect GitHub
        </button>
      ) : (
        <>
          <div>
            <label className="block font-medium mb-2">Paste GitHub Repo URL:</label>
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="border border-gray-400 px-3 py-2 rounded w-full"
              placeholder="https://github.com/username/repo"
            />
            <button
              onClick={fetchPythonFiles}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
            >
              Load Python Files
            </button>
          </div>

          {pythonFiles.length > 0 && (
            <div className="space-y-4">
              <label className="block font-medium">Select Python File:</label>
              <select
                value={selectedFile || ""}
                onChange={(e) => setSelectedFile(e.target.value)}
                className="border border-gray-400 px-3 py-2 rounded w-full"
              >
                {pythonFiles.map((file) => (
                  <option key={file} value={file}>
                    {file}
                  </option>
                ))}
              </select>

              <div className="mt-4">
                <label className="block font-medium mb-2">File Content:</label>
                <pre className="bg-gray-100 border border-gray-300 p-4 overflow-auto max-h-96 whitespace-pre-wrap text-sm">
                  {fileContent || "Loading..."}
                </pre>
                <button
  onClick={() => {
    if (!selectedFile || !fileContent) return;

    // Build files map (currently only one file shown — could be extended)
    const filesToPass = {
      [selectedFile]: fileContent,
    };

    navigate("/workspace", {
      state: {
        code: "", // optional fallback
        files: filesToPass,
        defaultFile: selectedFile,
      },
    });
  }}
  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
>
  Convert GitHub Repository
</button>

              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GitHubConnect;
