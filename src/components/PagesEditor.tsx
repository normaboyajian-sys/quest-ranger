import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { html as htmlLang } from "@codemirror/lang-html";
import { css as cssLang } from "@codemirror/lang-css";
import { javascript as jsLang } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { supabase } from "@/integrations/supabase/client";
import {
  createDesign,
  createPage,
  defaultContent,
  deleteDesign,
  deletePage,
  getDesigns,
  getHiddenShared,
  getPageIcon,
  getPageMeta,
  getPagesFor,
  isPageHidden,
  loadFile,
  loadFileCached,
  renameDesign,
  renamePage,
  resetFile,
  saveFile,
  setPageHidden,
  setPageIcon,
  setPageMeta,
  setSharedHidden,
  slugify,
  subscribeDesignChanges,
  subscribeRegistry,
  type DesignFile,
  type FileKind,
  type PageSlot,
} from "@/lib/designStore";



function sameFile(a: DesignFile, b: DesignFile) {
  return a.design === b.design && a.page === b.page && a.kind === b.kind;
}


export function PagesEditor() {
  const [designs, setDesigns] = useState(() => getDesigns());
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState<DesignFile | null>(null);
  const [content, setContent] = useState<string>("");
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const activeRef = useRef<DesignFile | null>(null);
  activeRef.current = active;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const contentRef = useRef(content);
  contentRef.current = content;


  // Initial sync — bundled designs are available synchronously.
  useEffect(() => {
    const list = getDesigns();
    setDesigns(list);
    setOpenFolders((s) => {
      const next = { ...s };
      for (const d of list) if (next[d.id] == null) next[d.id] = true;
      return next;
    });
    if (!activeRef.current) {
      const firstDesign = list[0];
      if (firstDesign) {
        const pages = getPagesFor(firstDesign.id);
        const first = pages[0];
        const target: DesignFile = first
          ? { design: firstDesign.id, page: first.page, kind: "html" }
          : { design: firstDesign.id, page: "shared", kind: "css" };
        void openFile(target);
      }
    }
    const offReg = subscribeRegistry(() => setDesigns(getDesigns()));
    return () => {
      offReg();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime design_pages updates
  useEffect(() => {
    const ch = subscribeDesignChanges(
      (d, p, k) => {
        const a = activeRef.current;
        return !!a && a.design === d && a.page === p && a.kind === k;
      },
      () => {
        if (dirtyRef.current) return;
        const a = activeRef.current;
        if (!a) return;
        const c = loadFileCached(a);
        setContent(c);
        contentRef.current = c;


      },
    );
    return () => {
      void ch.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  async function openFile(f: DesignFile) {
    setActive(f);
    activeRef.current = f;
    const cached = loadFileCached(f);
    setContent(cached);
    contentRef.current = cached;
    setDirty(false);
    setStatus("");
    const fresh = await loadFile(f);
    if (
      activeRef.current &&
      sameFile(activeRef.current, f) &&
      !dirtyRef.current
    ) {
      setContent(fresh);
      contentRef.current = fresh;
      
    }
  }

  async function onSave() {
    if (!active) return;
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
    if (!active) return;
    setStatus("Resetting…");
    try {
      await resetFile(active);
      const d = defaultContent(active);
      setContent(d);
      contentRef.current = d;
      setDirty(false);
      setStatus("Reset to default");
      setTimeout(() => setStatus(""), 1500);
    } catch (e) {
      setStatus("Reset failed");
      console.error(e);
    }
  }

  // ---- Tree mutations ----

  async function onAddDesign() {
    const label = window.prompt("New design name (e.g. \"Coinbase\")");
    if (!label) return;
    const id = slugify(label);
    if (!id) return;
    try {
      await createDesign(id, label.trim());
      setOpenFolders((s) => ({ ...s, [id]: true }));
      // Empty design — no files to open. User clicks + to add a page.
    } catch (e) {
      window.alert((e as Error).message);
    }
  }


  async function onRenameDesign(id: string, current: string) {
    const label = window.prompt("Rename design folder/link", current);
    if (!label || label.trim() === current) return;
    try {
      const nextId = await renameDesign(id, label.trim());
      if (nextId !== id) {
        setOpenFolders((s) => {
          const next = { ...s, [nextId]: s[id] ?? true };
          delete next[id];
          return next;
        });
        if (active?.design === id) {
          void openFile({ ...active, design: nextId });
        }
      }
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  async function onDeleteDesign(id: string, label: string) {
    if (!window.confirm(`Delete design "${label}" and all of its pages?`))
      return;
    try {
      await deleteDesign(id);
      if (active && active.design === id) {
        setActive(null);
        setContent("");
        contentRef.current = "";
      }
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  async function onAddPage(designId: string) {
    const label = window.prompt("New page name (e.g. \"Signup\")");
    if (!label) return;
    const slug = slugify(label, 40);
    try {
      await createPage(designId, slug, label.trim());
      void openFile({ design: designId, page: slug, kind: "html" });
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  async function onRenamePage(
    design: string,
    page: string,
    current: string,
  ) {
    const label = window.prompt("Rename page file/link", current);
    if (!label || label.trim() === current) return;
    try {
      const nextPage = await renamePage(design, page, label.trim());
      if (nextPage !== page && active?.design === design && active.page === page) {
        void openFile({ design, page: nextPage, kind: active.kind });
      }
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  async function onDeletePage(design: string, page: string, label: string) {
    if (!window.confirm(`Delete page "${label}"?`)) return;
    try {
      await deletePage(design, page);
      if (active && active.design === design && active.page === page) {
        setActive(null);
        setContent("");
        contentRef.current = "";
      }
    } catch (e) {
      window.alert((e as Error).message);
    }
  }



  async function onDeleteShared(design: string, kind: FileKind) {
    if (kind !== "css" && kind !== "js") return;
    const label = kind === "css" ? "styles.css" : "script.js";
    if (!window.confirm(`Delete ${label}? It will be removed from the design.`)) return;
    const target: DesignFile = { design, page: "shared", kind };
    try {
      await setSharedHidden(design, kind, true);
      if (active && sameFile(active, target)) {
        setActive(null);
        setContent("");
        contentRef.current = "";
        setDirty(false);
      }
      setStatus(`${label} deleted`);
      setTimeout(() => setStatus(""), 1500);
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  async function onRestoreShared(design: string, kind: FileKind) {
    if (kind !== "css" && kind !== "js") return;
    try {
      await setSharedHidden(design, kind, false);
      void openFile({ design, page: "shared", kind });
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  // ---- Render ----


  const extension = useMemo(() => {
    if (!active) return [];
    if (active.kind === "html") return [htmlLang()];
    if (active.kind === "css") return [cssLang()];
    return [jsLang()];
  }, [active]);

  const pathLabel = active
    ? `${designs.find((d) => d.id === active.design)?.label ?? active.design} / ${fileLabel(active)}`
    : "Select a file";

  return (
    <div className="admin-pages">
      <aside className="admin-pages-tree">
        <div className="admin-pages-tree-head">
          <span>Designs</span>
          <button
            type="button"
            className="admin-tree-btn"
            title="Add design"
            onClick={() => void onAddDesign()}
          >
            +
          </button>
        </div>

        {designs.length === 0 && (
          <p className="admin-pages-empty">No designs yet — click + to create one.</p>
        )}

        {designs.map((folder) => {
          const open = !!openFolders[folder.id];
          const pages = getPagesFor(folder.id);
          return (
            <div key={folder.id} className="admin-pages-folder">
              <div className="admin-pages-folder-row">
                <button
                  className="admin-pages-folder-toggle"
                  onClick={() =>
                    setOpenFolders((s) => ({ ...s, [folder.id]: !s[folder.id] }))
                  }
                  title={open ? "Collapse" : "Expand"}
                >
                  <span className={`admin-pages-caret ${open ? "is-open" : ""}`}>▸</span>
                  <span className="admin-pages-folder-icon">▤</span>
                  <span className="admin-pages-folder-label">{folder.label}</span>
                </button>
                <div className="admin-pages-folder-actions">
                  <button
                    type="button"
                    className="admin-tree-btn"
                    title="Add page"
                    onClick={() => void onAddPage(folder.id)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="admin-tree-btn"
                    title="Rename design"
                    onClick={() => void onRenameDesign(folder.id, folder.label)}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="admin-tree-btn admin-tree-btn-danger"
                    title="Delete design"
                    onClick={() => void onDeleteDesign(folder.id, folder.label)}
                  >
                    ×
                  </button>
                </div>
              </div>
              {open && (
                <div className="admin-pages-files">
                  {pages.map((pg) => {
                    const f: DesignFile = {
                      design: folder.id,
                      page: pg.page,
                      kind: "html",
                    };
                    const isActive = !!active && sameFile(f, active);
                    const hidden = isPageHidden(folder.id, pg.page);
                    const panelKey = `${folder.id}::${pg.page}`;
                    const panelOpen = openPanel === panelKey;
                    return (
                      <div key={pg.page} className="admin-pages-file-wrap">
                        <div
                          className={`admin-pages-file-row ${isActive ? "is-active" : ""} ${hidden ? "is-muted" : ""}`}
                          style={hidden ? { opacity: 0.55 } : undefined}
                        >
                          <button
                            className="admin-pages-file"
                            onClick={() => void openFile(f)}
                            title={`/${folder.id}/${pg.page}${hidden ? " · hidden from redirect" : ""}`}
                          >
                            <span className="admin-pages-file-icon">{hidden ? "◌" : "·"}</span>
                            {pg.label ?? pg.page}.html
                          </button>
                          <div className="admin-pages-file-actions">
                            <button
                              type="button"
                              className="admin-tree-btn admin-page-arrow"
                              title="Page settings"
                              aria-expanded={panelOpen}
                              onClick={() => setOpenPanel(panelOpen ? null : panelKey)}
                            >
                              <span className={`admin-page-arrow-icon ${panelOpen ? "is-open" : ""}`}>›</span>
                            </button>
                          </div>
                        </div>
                        {panelOpen && (
                          <PageSettingsPanel
                            design={folder.id}
                            page={pg.page}
                            label={pg.label ?? pg.page}
                            hidden={hidden}
                            onClose={() => setOpenPanel(null)}
                            onSavedMeta={() => {
                              setStatus("Page settings saved");
                              setTimeout(() => setStatus(""), 1500);
                            }}
                            onToggleHidden={() => void setPageHidden(folder.id, pg.page, !hidden)}
                            onRename={() => void onRenamePage(folder.id, pg.page, pg.label ?? pg.page)}
                            onDelete={() => {
                              setOpenPanel(null);
                              void onDeletePage(folder.id, pg.page, pg.label ?? pg.page);
                            }}
                          />
                        )}
                      </div>
                    );
                  })}


                  {/* Shared CSS / JS */}
                  {(["css", "js"] as FileKind[]).map((kind) => {
                    const f: DesignFile = {
                      design: folder.id,
                      page: "shared",
                      kind,
                    };
                    const isActive = !!active && sameFile(f, active);
                    const hidden = kind !== "html" && !!getHiddenShared(folder.id)[kind];
                    const label = kind === "css" ? "styles.css" : "script.js";
                    if (hidden) {
                      return (
                        <div key={kind} className="admin-pages-file-row is-muted">
                          <button
                            className="admin-pages-file"
                            onClick={() => void onRestoreShared(folder.id, kind)}
                            title={`Restore ${label}`}
                          >
                            <span className="admin-pages-file-icon">+</span>
                            Add {label}
                          </button>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={kind}
                        className={`admin-pages-file-row ${isActive ? "is-active" : ""}`}
                      >
                        <button
                          className="admin-pages-file"
                          onClick={() => void openFile(f)}
                        >
                          <span className="admin-pages-file-icon">·</span>
                          {label}
                        </button>
                        <div className="admin-pages-file-actions">
                          <button
                            type="button"
                            className="admin-tree-btn admin-tree-btn-danger"
                            title={`Delete ${label}`}
                            onClick={() => void onDeleteShared(folder.id, kind)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
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
            {active && (
              <a
                href={`/${active.design}/${active.page === "shared" ? "home" : active.page}`}
                target="_blank"
                rel="noreferrer"
                className="admin-pages-openlink"
              >
                ↗ open
              </a>
            )}
          </div>
          <div className="admin-pages-actions">
            {status && <span className="admin-pages-status">{status}</span>}
            <button
              className="admin-btn admin-btn-ghost"
              onClick={() => void onReset()}
              disabled={!active}
            >
              Reset
            </button>
            <button
              className="admin-btn admin-btn-primary"
              onClick={() => void onSave()}
              disabled={!active}
            >
              Save & publish
            </button>
          </div>
        </div>
        <div className="admin-pages-code">
          <CodeMirror
            ref={editorRef}
            value={content}
            height="100%"
            theme={oneDark}
            extensions={extension as ReturnType<typeof htmlLang>[]}
            onChange={(v) => {
              setContent(v);
              contentRef.current = v;
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

function fileLabel(f: DesignFile): string {
  if (f.page === "shared")
    return f.kind === "css" ? "styles.css" : "script.js";
  const pageRow = getPagesFor(f.design).find((p) => p.page === f.page);
  return `${pageRow?.label ?? f.page}.html`;
}

function PageSettingsPanel({
  design,
  page,
  label,
  hidden,
  onClose,
  onSavedMeta,
  onToggleHidden,
  onRename,
  onDelete,
}: {
  design: string;
  page: string;
  label: string;
  hidden: boolean;
  onClose: () => void;
  onSavedMeta: () => void;
  onToggleHidden: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const meta = getPageMeta(design, page);
  const [title, setTitle] = useState(meta.title ?? "");
  const [favicon, setFavicon] = useState(meta.favicon ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await setPageMeta(design, page, { title: title.trim(), favicon: favicon.trim() });
      onSavedMeta();
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-page-panel" role="dialog" aria-label={`${label} settings`}>
      <div className="admin-page-panel-head">
        <span className="admin-page-panel-title">{label}.html</span>
        <button className="admin-page-panel-close" onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className="admin-page-panel-section">
        <label className="admin-page-panel-field">
          <span>Browser tab title</span>
          <input
            type="text"
            value={title}
            placeholder="Use page's own <title>"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="admin-page-panel-field">
          <span>Favicon URL</span>
          <input
            type="text"
            value={favicon}
            placeholder="https://… or data:image/…"
            onChange={(e) => setFavicon(e.target.value)}
          />
        </label>
        <button
          className="admin-btn admin-btn-primary admin-page-panel-save"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>

      <div className="admin-page-panel-section admin-page-panel-row-actions">
        <button className="admin-btn admin-btn-ghost" onClick={onToggleHidden}>
          {hidden ? "◌  Show in redirect" : "◉  Hide from redirect"}
        </button>
        <button className="admin-btn admin-btn-ghost" onClick={onRename}>
          ✎  Rename
        </button>
        <button className="admin-btn admin-btn-ghost admin-btn-danger" onClick={onDelete}>
          ×  Delete page
        </button>
      </div>
    </div>
  );
}

// keep PageSlot referenced so unused-import lint doesn't strip it
export type _PageSlot = PageSlot;

