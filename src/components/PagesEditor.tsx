import { useEffect, useMemo, useRef, useState } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { javascript as jsLang } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { supabase } from "@/integrations/supabase/client";
import {
  getDesignSourcePath,
  getDesigns,
  getDesignLogo,
  getPageIcon,
  getPageMeta,
  getPagesFor,
  isPageHidden,
  loadFile,
  loadFileCached,
  resetFile,
  saveFile,
  setPageHidden,
  setPageIcon,
  setPageMeta,
  subscribeDesignChanges,
  subscribeRegistry,
  type DesignFile,
  type PageSlot,
} from "@/lib/designStore";

function sameFile(a: DesignFile, b: DesignFile) {
  return a.design === b.design && a.page === b.page && a.kind === b.kind;
}

type ViewMode = "preview" | "code";

export function PagesEditor() {
  const [designs, setDesigns] = useState(() => getDesigns());
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState<DesignFile | null>(null);
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState<ViewMode>("preview");
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const activeRef = useRef<DesignFile | null>(null);
  activeRef.current = active;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const contentRef = useRef(content);
  contentRef.current = content;

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
        if (first) {
          void openPage({ design: firstDesign.id, page: first.page, kind: "html" });
        }
      }
    }
    const offReg = subscribeRegistry(() => setDesigns(getDesigns()));
    return () => offReg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setPreviewKey((n) => n + 1);
      },
    );
    return () => {
      void ch.unsubscribe();
    };
  }, []);

  async function openPage(f: DesignFile) {
    setActive(f);
    activeRef.current = f;
    setMode("preview");
    setOpenPanel(null);
    const cached = loadFileCached(f);
    setContent(cached);
    contentRef.current = cached;
    setDirty(false);
    setStatus("");
    setPreviewKey((n) => n + 1);
    const fresh = await loadFile(f);
    if (activeRef.current && sameFile(activeRef.current, f) && !dirtyRef.current) {
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
      setStatus("Saved");
      setPreviewKey((n) => n + 1);
      setTimeout(() => setStatus(""), 1500);
    } catch (e) {
      setStatus("Save failed");
      console.error(e);
    }
  }

  async function onReset() {
    if (!active) return;
    if (!window.confirm("Reset this page to the bundled default?")) return;
    setStatus("Resetting…");
    try {
      await resetFile(active);
      const d = loadFileCached(active);
      setContent(d);
      contentRef.current = d;
      setDirty(false);
      setStatus("Reset");
      setPreviewKey((n) => n + 1);
      setTimeout(() => setStatus(""), 1500);
    } catch (e) {
      setStatus("Reset failed");
      console.error(e);
    }
  }

  const extension = useMemo(
    () => [jsLang({ jsx: true, typescript: true })],
    [],
  );

  const previewUrl = active
    ? `/${active.design}/${active.page}?__observe=1`
    : null;

  const pageTitle = active
    ? getPagesFor(active.design).find((p) => p.page === active.page)?.label ?? active.page
    : null;

  const designLabel = active
    ? designs.find((d) => d.id === active.design)?.label ?? active.design
    : null;

  return (
    <div className="admin-pages">
      <aside className="admin-pages-tree">
        <div className="admin-pages-tree-head">
          <span>Designs</span>
        </div>

        {designs.length === 0 && (
          <p className="admin-pages-empty">No designs available.</p>
        )}

        {designs.map((folder) => {
          const open = !!openFolders[folder.id];
          const pages = getPagesFor(folder.id);
          return (
            <div key={folder.id} className="admin-pages-folder">
              <div className="admin-pages-folder-row">
                <button
                  type="button"
                  className="admin-pages-folder-toggle"
                  onClick={() =>
                    setOpenFolders((s) => ({ ...s, [folder.id]: !s[folder.id] }))
                  }
                  title={open ? "Collapse" : "Expand"}
                >
                  <span className={`admin-pages-caret ${open ? "is-open" : ""}`}>▸</span>
                  {(() => {
                    const logo = getDesignLogo(folder.id);
                    return logo ? (
                      <span className="admin-pages-folder-icon admin-pages-folder-icon-img">
                        <img src={logo} alt="" />
                      </span>
                    ) : (
                      <span className="admin-pages-folder-icon">▤</span>
                    );
                  })()}
                  <span className="admin-pages-folder-label">{folder.label}</span>
                </button>
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
                        >
                          <button
                            type="button"
                            className="admin-pages-file"
                            onClick={() => void openPage(f)}
                            title={`/${folder.id}/${pg.page}${hidden ? " · hidden from redirect" : ""}`}
                          >
                            {(() => {
                              const pIcon = getPageIcon(folder.id, pg.page) ?? getDesignLogo(folder.id);
                              return pIcon ? (
                                <span className="admin-pages-file-icon admin-pages-file-icon-img">
                                  <img src={pIcon} alt="" />
                                </span>
                              ) : (
                                <span className="admin-pages-file-icon">{hidden ? "◌" : "·"}</span>
                              );
                            })()}
                            <span className="admin-pages-file-name">{pg.label ?? pg.page}</span>
                            {hidden && <span className="admin-pages-file-badge">hidden</span>}
                          </button>
                          <div className="admin-pages-file-actions">
                            <button
                              type="button"
                              className="admin-tree-btn"
                              title={hidden ? "Show in redirect" : "Hide from redirect"}
                              onClick={() => void setPageHidden(folder.id, pg.page, !hidden)}
                            >
                              {hidden ? "◌" : "◉"}
                            </button>
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
                              setStatus("Settings saved");
                              setTimeout(() => setStatus(""), 1500);
                            }}
                            onToggleHidden={() => void setPageHidden(folder.id, pg.page, !hidden)}
                          />
                        )}
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
            {active && pageTitle ? (
              <>
                <span className="admin-pages-path-design">{designLabel}</span>
                <span className="admin-pages-path-sep">/</span>
                <span className="admin-pages-path-page">{pageTitle}</span>
                {mode === "code" && (
                  <span className="admin-pages-source">{getDesignSourcePath(active)}</span>
                )}
              </>
            ) : (
              <span className="admin-pages-path-empty">Select a page</span>
            )}
            {dirty ? <span className="admin-pages-dirty">· unsaved</span> : null}
          </div>
          <div className="admin-pages-actions">
            {status && <span className="admin-pages-status">{status}</span>}
            {active && (
              <div className="admin-pages-mode">
                <button
                  type="button"
                  className={`admin-pages-mode-btn ${mode === "preview" ? "is-active" : ""}`}
                  onClick={() => setMode("preview")}
                >
                  Preview
                </button>
                <button
                  type="button"
                  className={`admin-pages-mode-btn ${mode === "code" ? "is-active" : ""}`}
                  onClick={() => setMode("code")}
                >
                  Edit code
                </button>
              </div>
            )}
            {mode === "code" && (
              <>
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
                  disabled={!active || !dirty}
                >
                  Save
                </button>
              </>
            )}
            {mode === "preview" && active && (
              <button
                className="admin-btn admin-btn-ghost"
                onClick={() => setPreviewKey((n) => n + 1)}
                title="Reload preview"
              >
                Reload
              </button>
            )}
          </div>
        </div>

        {mode === "preview" ? (
          <div className="admin-pages-preview">
            {!previewUrl ? (
              <div className="admin-pages-preview-empty">
                <p>Select a page to preview.</p>
              </div>
            ) : (
              <>
                <div className="admin-pages-preview-hint">
                  Interactive preview — clicks work, navigation is disabled
                </div>
                <iframe
                  key={`${previewUrl}:${previewKey}`}
                  title="Page preview"
                  src={previewUrl}
                  className="admin-pages-preview-frame"
                />
              </>
            )}
          </div>
        ) : (
          <div className="admin-pages-code">
            <CodeMirror
              ref={editorRef}
              value={content}
              height="100%"
              theme={oneDark}
              extensions={extension}
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
        )}
      </section>
    </div>
  );
}

function PageSettingsPanel({
  design,
  page,
  label,
  hidden,
  onClose,
  onSavedMeta,
  onToggleHidden,
}: {
  design: string;
  page: string;
  label: string;
  hidden: boolean;
  onClose: () => void;
  onSavedMeta: () => void;
  onToggleHidden: () => void;
}) {
  const meta = getPageMeta(design, page);
  const [title, setTitle] = useState(meta.title ?? "");
  const [favicon, setFavicon] = useState(meta.favicon ?? "");
  const [icon, setIcon] = useState<string | null>(getPageIcon(design, page));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  async function onPickIcon(file: File) {
    if (!file.type.startsWith("image/")) {
      window.alert("Please pick a PNG, JPG, or SVG image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      window.alert("Image must be under 2 MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${design}/${page}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("design-icons")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("design-icons").getPublicUrl(path);
      await setPageIcon(design, page, data.publicUrl);
      setIcon(data.publicUrl);
      onSavedMeta();
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function clearIcon() {
    await setPageIcon(design, page, null);
    setIcon(null);
    onSavedMeta();
  }

  return (
    <div className="admin-page-panel" role="dialog" aria-label={`${label} settings`}>
      <div className="admin-page-panel-head">
        <span className="admin-page-panel-title">{label}</span>
        <button type="button" className="admin-page-panel-close" onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className="admin-page-panel-section">
        <div className="admin-page-icon-row">
          <button
            type="button"
            className="admin-page-icon-slot"
            onClick={() => fileInputRef.current?.click()}
            title="Upload custom icon"
            disabled={uploading}
          >
            {icon ? (
              <img src={icon} alt="" />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            )}
            <span className="admin-page-icon-overlay">{uploading ? "…" : icon ? "Change" : "Upload"}</span>
          </button>
          <div className="admin-page-icon-meta">
            <span className="admin-page-icon-label">Page icon</span>
            <span className="admin-page-icon-hint">Shows in the redirect picker.</span>
            {icon && (
              <button type="button" className="admin-page-icon-clear" onClick={() => void clearIcon()}>
                Remove icon
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPickIcon(f);
              e.target.value = "";
            }}
          />
        </div>

        <label className="admin-page-panel-field">
          <span>Browser tab title</span>
          <input
            type="text"
            value={title}
            placeholder="Page title"
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
          type="button"
          className="admin-btn admin-btn-primary admin-page-panel-save"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>

      <div className="admin-page-panel-section admin-page-panel-row-actions">
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onToggleHidden}>
          {hidden ? "◌  Show in redirect" : "◉  Hide from redirect"}
        </button>
      </div>
    </div>
  );
}

export type _PageSlot = PageSlot;
