import { useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { html as htmlLang } from "@codemirror/lang-html";
import { css as cssLang } from "@codemirror/lang-css";
import { javascript as jsLang } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  DESIGN_LABELS,
  PAGE_LINKS,
  PAGE_LABELS,
  defaultContent,
  ensureDefaultDesignPages,
  loadAll,
  loadFile,
  loadFileCached,
  resetFile,
  saveFile,
  subscribeDesignChanges,
  type DesignFile,
  type DesignKey,
  type FileKind,
  type PageSlot,
} from "@/lib/designStore";

type FileNode = { kind: "file"; file: DesignFile; label: string };
type FolderNode = {
  kind: "folder";
  design: DesignKey;
  label: string;
  children: FileNode[];
};

function buildTree(): FolderNode[] {
  const designs: DesignKey[] = ["red", "blue"];
  return designs.map((d) => ({
    kind: "folder",
    design: d,
    label: DESIGN_LABELS[d],
    children: [
      { kind: "file", file: { design: d, page: "home", kind: "html" }, label: "home.html" },
      { kind: "file", file: { design: d, page: "contact", kind: "html" }, label: "contact.html" },
      { kind: "file", file: { design: d, page: "shared", kind: "css" }, label: "styles.css" },
      { kind: "file", file: { design: d, page: "shared", kind: "js" }, label: "script.js" },
    ],
  }));
}

function sameFile(a: DesignFile, b: DesignFile) {
  return a.design === b.design && a.page === b.page && a.kind === b.kind;
}

export function PagesEditor() {
  const tree = useMemo(buildTree, []);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    red: true,
    blue: true,
  });
  const [active, setActive] = useState<DesignFile>({
    design: "red",
    page: "home",
    kind: "html",
  });
  const [content, setContent] = useState<string>(() => loadFileCached(active));
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string>("");
  const activeRef = useRef(active);
  activeRef.current = active;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  // Initial DB sync + realtime subscription so the cache stays fresh.
  useEffect(() => {
    let cancelled = false;
    void ensureDefaultDesignPages().then(loadAll).then(async () => {
      if (cancelled) return;
      const fresh = await loadFile(activeRef.current);
      if (!cancelled && !dirtyRef.current) setContent(fresh);
    });
    const ch = subscribeDesignChanges(
      (design, page, kind) =>
        sameFile(activeRef.current, { design, page: page as PageSlot, kind: kind as FileKind }),
      () => {
        if (dirtyRef.current) return; // don't clobber unsaved edits
        setContent(loadFileCached(activeRef.current));
      },
    );
    return () => {
      cancelled = true;
      void ch.unsubscribe();
    };
  }, []);

  async function openFile(f: DesignFile) {
    setActive(f);
    setContent(loadFileCached(f));
    setDirty(false);
    setStatus("");
    const fresh = await loadFile(f);
    if (sameFile(activeRef.current, f) && !dirtyRef.current) setContent(fresh);
  }

  async function onSave() {
    setStatus("Saving…");
    try {
      await saveFile(active, content);
      setDirty(false);
      setStatus("Saved & published");
      setTimeout(() => setStatus(""), 1500);
    } catch (e) {
      setStatus("Save failed");
      console.error(e);
    }
  }

  async function onReset() {
    setStatus("Resetting…");
    try {
      await resetFile(active);
      const d = defaultContent(active);
      setContent(d);
      setDirty(false);
      setStatus("Reset to default");
      setTimeout(() => setStatus(""), 1500);
    } catch (e) {
      setStatus("Reset failed");
      console.error(e);
    }
  }

  const extension =
    active.kind === "html" ? [htmlLang()] : active.kind === "css" ? [cssLang()] : [jsLang()];

  const pathLabel = `${DESIGN_LABELS[active.design]} / ${
    active.page === "shared"
      ? active.kind === "css"
        ? "styles.css"
        : "script.js"
      : `${PAGE_LABELS[active.page]}.html`
  }`;

  return (
    <div className="admin-pages">
      <aside className="admin-pages-tree">
        <div className="admin-pages-tree-head">Designs</div>
        <div className="admin-pages-links">
          {PAGE_LINKS.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
              {link.url}
            </a>
          ))}
        </div>
        {tree.map((folder) => {
          const open = !!openFolders[folder.design];
          return (
            <div key={folder.design} className="admin-pages-folder">
              <button
                className="admin-pages-folder-row"
                onClick={() =>
                  setOpenFolders((s) => ({ ...s, [folder.design]: !s[folder.design] }))
                }
              >
                <span className={`admin-pages-caret ${open ? "is-open" : ""}`}>▸</span>
                <span className="admin-pages-folder-icon">▤</span>
                <span>{folder.label}</span>
              </button>
              {open && (
                <div className="admin-pages-files">
                  {folder.children.map((c) => {
                    const isActive = sameFile(c.file, active);
                    return (
                      <button
                        key={c.label}
                        className={`admin-pages-file ${isActive ? "is-active" : ""}`}
                        onClick={() => void openFile(c.file)}
                      >
                        <span className="admin-pages-file-icon">·</span>
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </aside>

      <section className="admin-pages-editor">
        <div className="admin-pages-bar">
          <div className="admin-pages-path">
            {pathLabel}
            {dirty ? " ·" : ""}
          </div>
          <div className="admin-pages-actions">
            {status && <span className="admin-pages-status">{status}</span>}
            <button className="admin-btn admin-btn-ghost" onClick={() => void onReset()}>
              Reset
            </button>
            <button className="admin-btn admin-btn-primary" onClick={() => void onSave()}>
              Save & publish
            </button>
          </div>
        </div>
        <div className="admin-pages-code">
          <CodeMirror
            value={content}
            height="100%"
            theme={oneDark}
            extensions={extension}
            onChange={(v) => {
              setContent(v);
              setDirty(true);
            }}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
              autocompletion: true,
              tabSize: 2,
            }}
          />
        </div>
      </section>
    </div>
  );
}
