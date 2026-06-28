import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { uploadDropFile, deleteDropFile } from "@/lib/file-drop.functions";

type DropFile = {
  id: string;
  filename: string;
  size: number;
  expiresAt: number;
  url: string;
};

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function fmtRemaining(ms: number): string {
  if (ms <= 0) return "expired";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function FileUploader() {
  const upload = useServerFn(uploadDropFile);
  const del = useServerFn(deleteDropFile);
  const [files, setFiles] = useState<DropFile[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("file_drop_v1");
      if (!raw) return [];
      return (JSON.parse(raw) as DropFile[]).filter((f) => f.expiresAt > Date.now());
    } catch {
      return [];
    }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [, force] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setFiles((prev) => prev.filter((f) => f.expiresAt > Date.now()));
      force((n) => n + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("file_drop_v1", JSON.stringify(files));
    } catch {
      /* ignore */
    }
  }, [files]);

  async function handleFiles(selected: FileList | File[] | null) {
    if (!selected || (selected as FileList).length === 0) return;
    setError(null);
    setBusy(true);
    try {
      const list = Array.from(selected as FileList);
      for (const file of list) {
        const fd = new FormData();
        fd.append("file", file);
        const result = (await upload({ data: fd })) as DropFile;
        setFiles((prev) => [result, ...prev]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function copyLink(f: DropFile) {
    const full = `${window.location.origin}${f.url}`;
    try {
      await navigator.clipboard.writeText(full);
      setCopied(f.id);
      setTimeout(() => setCopied((c) => (c === f.id ? null : c)), 1400);
    } catch {
      /* ignore */
    }
  }

  async function remove(f: DropFile) {
    setFiles((prev) => prev.filter((x) => x.id !== f.id));
    try {
      await del({ data: { id: f.id } });
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="file-drop">
      <header className="file-drop-head">
        <div>
          <h2 className="file-drop-title">File Uploader</h2>
          <p className="file-drop-sub">
            Upload a file, get a direct-download link valid for 5 minutes. After that the file is
            removed from storage automatically.
          </p>
        </div>
      </header>

      <label
        className={`file-drop-zone ${drag ? "is-drag" : ""} ${busy ? "is-busy" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <div className="file-drop-zone-inner">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 3v12" />
            <path d="m7 8 5-5 5 5" />
            <path d="M5 21h14" />
          </svg>
          <div className="file-drop-zone-text">
            {busy ? "Uploading…" : "Drop a file here or click to choose"}
          </div>
          <div className="file-drop-zone-hint">Max 100 MB · auto-deletes after 5 minutes</div>
        </div>
      </label>

      {error && <div className="file-drop-error">{error}</div>}

      <ul className="file-drop-list">
        {files.length === 0 && !busy && (
          <li className="file-drop-empty">No active uploads.</li>
        )}
        {files.map((f) => {
          const remaining = f.expiresAt - Date.now();
          const pct = Math.max(0, Math.min(100, (remaining / (5 * 60 * 1000)) * 100));
          const full = typeof window !== "undefined" ? `${window.location.origin}${f.url}` : f.url;
          return (
            <li key={f.id} className="file-drop-item">
              <div className="file-drop-item-row">
                <div className="file-drop-item-name" title={f.filename}>{f.filename}</div>
                <div className="file-drop-item-size">{fmtBytes(f.size)}</div>
                <div className="file-drop-item-timer" title="Time remaining">
                  {fmtRemaining(remaining)}
                </div>
              </div>
              <div className="file-drop-bar"><div className="file-drop-bar-fill" style={{ width: `${pct}%` }} /></div>
              <div className="file-drop-item-actions">
                <input className="file-drop-link" readOnly value={full} onFocus={(e) => e.currentTarget.select()} />
                <button type="button" className="file-drop-btn" onClick={() => copyLink(f)}>
                  {copied === f.id ? "Copied" : "Copy"}
                </button>
                <a className="file-drop-btn" href={f.url} target="_blank" rel="noreferrer">Open</a>
                <button type="button" className="file-drop-btn is-danger" onClick={() => void remove(f)}>
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
