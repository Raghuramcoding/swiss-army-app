import { useState, useMemo } from "react";
import {
  Github, Folder, File as FileIcon, Save, Eye, EyeOff,
  ChevronLeft, RefreshCw, Loader2, Check,
} from "lucide-react";
import { Field, TextArea, ErrorNote, RunButton } from "../components/shared";

export function GitHubTool() {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [repoInput, setRepoInput] = useState("");
  const [branch, setBranch] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [path, setPath] = useState("");
  const [entries, setEntries] = useState([]);
  const [file, setFile] = useState(null);
  const [editedContent, setEditedContent] = useState("");
  const [commitMsg, setCommitMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  function parseRepo(input) {
    const cleaned = input.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "");
    const parts = cleaned.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  }

  const repo = useMemo(() => parseRepo(repoInput), [repoInput]);

  async function ghFetch(url, options = {}) {
    const res = await fetch(`https://api.github.com${url}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `GitHub returned an error (${res.status}).`);
    }
    return res.json();
  }

  async function connect() {
    if (!repo) {
      setError("Enter a repo as owner/name, or paste a GitHub URL.");
      return;
    }
    if (!token.trim()) {
      setError("Paste a personal access token first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const repoData = await ghFetch(`/repos/${repo.owner}/${repo.repo}`);
      const defaultBranch = repoData.default_branch || "main";
      setBranch(defaultBranch);
      setConnected(true);
      await loadDirectory("", defaultBranch);
    } catch (e) {
      setError(e.message);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadDirectory(dirPath, branchOverride) {
    setLoading(true);
    setError("");
    setFile(null);
    try {
      const b = branchOverride || branch;
      const data = await ghFetch(`/repos/${repo.owner}/${repo.repo}/contents/${dirPath}?ref=${b}`);
      const list = Array.isArray(data) ? data : [data];
      list.sort((a, b2) => (a.type === b2.type ? a.name.localeCompare(b2.name) : a.type === "dir" ? -1 : 1));
      setEntries(list);
      setPath(dirPath);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function openFile(entry) {
    setLoading(true);
    setError("");
    setSaveSuccess(false);
    setSaveError("");
    try {
      const data = await ghFetch(`/repos/${repo.owner}/${repo.repo}/contents/${entry.path}?ref=${branch}`);
      const content = data.encoding === "base64" ? decodeURIComponent(escape(atob(data.content.replace(/\n/g, "")))) : data.content;
      setFile({ path: data.path, sha: data.sha });
      setEditedContent(content);
      setCommitMsg(`Update ${data.path}`);
    } catch {
      setError("Couldn't open that file — it may be binary or too large to edit here.");
    } finally {
      setLoading(false);
    }
  }

  async function saveFile() {
    if (!file) return;
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      const encoded = btoa(unescape(encodeURIComponent(editedContent)));
      await ghFetch(`/repos/${repo.owner}/${repo.repo}/contents/${file.path}`, {
        method: "PUT",
        body: JSON.stringify({
          message: commitMsg || `Update ${file.path}`,
          content: encoded,
          sha: file.sha,
          branch,
        }),
      });
      setSaveSuccess(true);
      const data = await ghFetch(`/repos/${repo.owner}/${repo.repo}/contents/${file.path}?ref=${branch}`);
      setFile({ path: data.path, sha: data.sha });
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const pathCrumbs = path ? path.split("/") : [];

  if (!connected) {
    return (
      <div className="space-y-4 max-w-md">
        <Field label="Personal access token">
          <div className="relative">
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_…"
              className="w-full rounded-md border border-white/10 bg-well px-3 py-2 pr-9 text-sm font-mono text-[#EDEEF0] focus:outline-none focus:ring-1 focus:ring-amber/60"
            />
            <button
              type="button"
              onClick={() => setShowToken((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5A6068] hover:text-white"
            >
              {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p className="text-xs text-[#5A6068]">
            Stored only in this browser session — never sent anywhere except GitHub. Needs "repo" scope to edit files.
          </p>
        </Field>
        <Field label="Repository">
          <input
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            placeholder="owner/repo or a GitHub URL"
            className="w-full rounded-md border border-white/10 bg-well px-3 py-2 text-sm font-mono text-[#EDEEF0] focus:outline-none focus:ring-1 focus:ring-amber/60"
          />
        </Field>
        <RunButton onClick={connect} loading={loading}>Connect</RunButton>
        <ErrorNote message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-sm font-mono text-[#8B92A0]">
          <Github size={15} />
          <span className="text-[#EDEEF0]">{repo.owner}/{repo.repo}</span>
          <span className="text-[#5A6068]">@ {branch}</span>
        </div>
        <button
          onClick={() => { setConnected(false); setFile(null); setEntries([]); setPath(""); }}
          className="text-xs font-mono text-[#5A6068] hover:text-white"
        >
          Disconnect
        </button>
      </div>

      {!file ? (
        <>
          <div className="flex items-center gap-1 text-sm font-mono flex-wrap">
            <button onClick={() => loadDirectory("")} className="text-[#8B92A0] hover:text-amber">root</button>
            {pathCrumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-[#5A6068]">/</span>
                <button
                  onClick={() => loadDirectory(pathCrumbs.slice(0, i + 1).join("/"))}
                  className="text-[#8B92A0] hover:text-amber"
                >
                  {c}
                </button>
              </span>
            ))}
            <button onClick={() => loadDirectory(path)} className="ml-2 text-[#5A6068] hover:text-white" title="Refresh">
              <RefreshCw size={13} />
            </button>
          </div>
          <ErrorNote message={error} />
          <div className="rounded-lg border border-white/10 bg-well divide-y divide-white/5 max-h-96 overflow-y-auto">
            {loading && <div className="px-3 py-3 text-sm text-[#5A6068] flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>}
            {!loading && entries.length === 0 && <div className="px-3 py-3 text-sm text-[#5A6068]">Empty directory.</div>}
            {!loading && entries.map((e) => (
              <button
                key={e.path}
                onClick={() => (e.type === "dir" ? loadDirectory(e.path) : openFile(e))}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/[0.04] text-sm"
              >
                {e.type === "dir" ? <Folder size={15} className="text-teal" /> : <FileIcon size={15} className="text-[#8B92A0]" />}
                <span className="text-[#EDEEF0]">{e.name}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={() => setFile(null)} className="inline-flex items-center gap-1 text-sm font-mono text-[#8B92A0] hover:text-white">
              <ChevronLeft size={14} /> Back to files
            </button>
            <span className="text-sm font-mono text-[#5A6068]">{file.path}</span>
          </div>
          <TextArea value={editedContent} onChange={setEditedContent} rows={16} />
          <Field label="Commit message">
            <input
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-well px-3 py-2 text-sm font-mono text-[#EDEEF0] focus:outline-none focus:ring-1 focus:ring-amber/60"
            />
          </Field>
          <div className="flex items-center gap-3">
            <button
              onClick={saveFile}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-amber px-4 py-2 text-sm font-semibold text-ink hover:bg-[#f0b257] disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Commit to {branch}
            </button>
            {saveSuccess && <span className="text-sm text-teal flex items-center gap-1"><Check size={14} /> Committed</span>}
          </div>
          <ErrorNote message={saveError} />
        </div>
      )}
    </div>
  );
}
