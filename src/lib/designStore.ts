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
  writeDesignFile,
  writeDesignIndex,
  writeDesignMeta,
} from "@/lib/designFs.functions";

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

const BUNDLED_INDEX: { order: string[] } =
  Object.values(INDEX_FILE)[0] ?? { order: [] };

// ---- Mutable runtime state (overrides on top of bundled files) ----

const OVERRIDE_PREFIX = "design_override:";
const META_PREFIX = "design_meta_override:";
const INDEX_KEY = "design_index_override";

export type PageMeta = { title?: string; favicon?: string };
type MetaEntry = {
  label: string;
  pages: Record<string, string>;
  pageMeta: Record<string, PageMeta>;
};


const _contentOverrides = new Map<string, string>(); // key = design:page:kind
const _metaOverrides = new Map<string, MetaEntry>(); // key = design
let _indexOverride: { order: string[] } | null = null;

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
            _metaOverrides.set(k.slice(META_PREFIX.length), JSON.parse(v));
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
    };
  return { label: designId, pages: {}, pageMeta: {} };
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
    if (t || f) cleaned[k] = { ...(t ? { title: t } : {}), ...(f ? { favicon: f } : {}) };
  }
  const next: MetaEntry = { label: meta.label, pages: meta.pages, pageMeta: cleaned };
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
  const order = currentIndex().order.slice();
  // Include any design that has a meta override or a bundled meta but isn't in
  // the index (defensive).
  const seen = new Set(order);
  for (const k of Object.keys(META_FILES)) {
    const id = k.split("/")[3];
    if (id && !seen.has(id)) {
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
  return Object.entries(meta.pages).map(([page, label]) => ({
    design,
    page,
    label,
  }));
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
  const ov = _contentOverrides.get(overrideKey(f));
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
  _contentOverrides.set(overrideKey(f), content);
  lsSet(OVERRIDE_PREFIX + overrideKey(f), content);
  notifyFile(f);
  try {
    await writeDesignFile({
      data: { design: f.design, page: f.page, kind: f.kind, content },
    });
  } catch {
    // Disk write may fail (prod / readonly FS). Local override still applies.
  }
}

export async function resetFile(f: DesignFile): Promise<void> {
  _contentOverrides.delete(overrideKey(f));
  lsDel(OVERRIDE_PREFIX + overrideKey(f));
  const bundled = bundledContent(f);
  notifyFile(f);
  // Rewrite disk to the bundled (source-of-truth) content so dev FS matches.
  try {
    await writeDesignFile({
      data: {
        design: f.design,
        page: f.page,
        kind: f.kind,
        content: bundled ?? defaultContent(f),
      },
    });
  } catch {
    /* ignore */
  }
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
      data: { design: designId, label: meta.label, pages: meta.pages },
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

export async function createDesign(
  id: string,
  label: string,
): Promise<DesignRecord> {
  if (!SLUG_RE.test(id)) throw new Error("Invalid design id");
  if (getDesigns().some((d) => d.id === id))
    throw new Error("Design already exists");
  const trimmed = label.trim() || id;
  _metaOverrides.set(id, {
    label: trimmed,
    pages: { home: "Home" },
    pageMeta: {},
  });
  lsSet(
    META_PREFIX + id,
    JSON.stringify({ label: trimmed, pages: { home: "Home" }, pageMeta: {} }),
  );

  await saveFile(
    { design: id, page: "home", kind: "html" },
    defaultHTML(`${trimmed} — Home`),
  );
  await saveFile({ design: id, page: "shared", kind: "css" }, defaultCSS());
  await saveFile({ design: id, page: "shared", kind: "js" }, defaultJS());
  await persistMeta(id);
  await persistIndex();
  return { id, label: trimmed, sort_order: getDesigns().length };
}

export async function renameDesign(id: string, label: string): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Label required");
  const meta = metaFor(id);
  _metaOverrides.set(id, { label: trimmed, pages: { ...meta.pages } });
  lsSet(
    META_PREFIX + id,
    JSON.stringify({ label: trimmed, pages: meta.pages }),
  );
  notifyRegistry();
  await persistMeta(id);
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
  _metaOverrides.set(design, { label: meta.label, pages: nextPages });
  lsSet(
    META_PREFIX + design,
    JSON.stringify({ label: meta.label, pages: nextPages }),
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
): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Label required");
  const meta = metaFor(design);
  if (!(page in meta.pages)) throw new Error("Page not found");
  const nextPages = { ...meta.pages, [page]: trimmed };
  _metaOverrides.set(design, { label: meta.label, pages: nextPages });
  lsSet(
    META_PREFIX + design,
    JSON.stringify({ label: meta.label, pages: nextPages }),
  );
  notifyRegistry();
  await persistMeta(design);
}

export async function deletePage(design: string, page: string): Promise<void> {
  const meta = metaFor(design);
  if (!(page in meta.pages)) return;
  const nextPages = { ...meta.pages };
  delete nextPages[page];
  _metaOverrides.set(design, { label: meta.label, pages: nextPages });
  lsSet(
    META_PREFIX + design,
    JSON.stringify({ label: meta.label, pages: nextPages }),
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
  const trimmed = html.trimStart().toLowerCase();
  if (trimmed.startsWith("<!doctype") || trimmed.startsWith("<html")) {
    return injectTracker(html);
  }
  return wrap(html, css, js);
}

const TRACKER_SCRIPT = `<script>
window.track = function(field, value){ try { parent.postMessage({__ux:true, type:'input', field, value}, '*'); } catch(e){} };
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
