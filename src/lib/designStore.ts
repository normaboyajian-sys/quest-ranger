// DB-backed dynamic registry of designs + pages, plus per-file HTML/CSS/JS.
// Storage:
//   public.designs(id, label, sort_order)              — list of designs
//   public.design_pages(design, page, kind, content)   — per-file source
// Both are mirrored locally for instant reads and updated via Realtime so
// every viewer/admin sees changes immediately.

import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Open string types: design and page slugs are now user-defined.
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
  page: string; // page slug (excluding "shared")
  label: string | null;
};

const CACHE_KEY = (f: DesignFile) => `design:${f.design}:${f.page}:${f.kind}`;
const DESIGNS_CACHE = "designs:list";
const PAGES_CACHE = "designs:pages";

// In-memory mirrors (also persisted to localStorage so first paint is instant).
let _designs: DesignRecord[] = [];
let _pages: PageRecord[] = []; // unique (design,page) where kind='html'
const _registryListeners = new Set<() => void>();

function loadRegistryFromCache() {
  if (typeof window === "undefined") return;
  try {
    const d = localStorage.getItem(DESIGNS_CACHE);
    if (d) _designs = JSON.parse(d);
    const p = localStorage.getItem(PAGES_CACHE);
    if (p) _pages = JSON.parse(p);
  } catch {
    /* ignore */
  }
}
loadRegistryFromCache();

function saveRegistryToCache() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DESIGNS_CACHE, JSON.stringify(_designs));
    localStorage.setItem(PAGES_CACHE, JSON.stringify(_pages));
  } catch {
    /* quota */
  }
}

function notifyRegistry() {
  saveRegistryToCache();
  for (const l of _registryListeners) l();
}

export function getDesigns(): DesignRecord[] {
  return _designs.slice();
}
export function getPagesFor(design: string): PageRecord[] {
  return _pages.filter((p) => p.design === design);
}
export function getDesignLabel(id: string): string {
  return _designs.find((d) => d.id === id)?.label ?? id;
}
export function getPageLabel(design: string, page: string): string {
  const row = _pages.find((p) => p.design === design && p.page === page);
  return row?.label ?? page;
}
export function subscribeRegistry(fn: () => void): () => void {
  _registryListeners.add(fn);
  return () => _registryListeners.delete(fn);
}

// ---- Defaults for new files (minimal generic skeletons) ----

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
    <p style="color:#666;">Edit this page from the admin Pages tab — or ask the AI in the right sidebar.</p>
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function defaultContent(f: DesignFile): string {
  if (f.kind === "css") return defaultCSS();
  if (f.kind === "js") return defaultJS();
  const label = f.page === "shared" ? "Page" : getPageLabel(f.design, f.page);
  return defaultHTML(label);
}

// ---- File content cache ----

function readCache(f: DesignFile): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CACHE_KEY(f));
}
function writeCache(f: DesignFile, content: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY(f), content);
  } catch {
    /* quota */
  }
}

export function loadFileCached(f: DesignFile): string {
  return readCache(f) ?? defaultContent(f);
}

export async function loadFile(f: DesignFile): Promise<string> {
  const { data } = await supabase
    .from("design_pages")
    .select("content")
    .eq("design", f.design)
    .eq("page", f.page)
    .eq("kind", f.kind)
    .maybeSingle();
  if (data?.content != null) {
    writeCache(f, data.content);
    return data.content;
  }
  return loadFileCached(f);
}

export async function saveFile(f: DesignFile, content: string): Promise<void> {
  writeCache(f, content);
  const { error } = await supabase.from("design_pages").upsert(
    {
      design: f.design,
      page: f.page,
      kind: f.kind,
      content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "design,page,kind" },
  );
  if (error) throw error;
}

export async function resetFile(f: DesignFile): Promise<void> {
  await saveFile(f, defaultContent(f));
}

// ---- Registry loaders ----

export async function loadDesigns(): Promise<DesignRecord[]> {
  const { data } = await supabase
    .from("designs")
    .select("id,label,sort_order")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });
  _designs = (data ?? []) as DesignRecord[];
  notifyRegistry();
  return _designs;
}

export async function loadPagesRegistry(): Promise<PageRecord[]> {
  const { data } = await supabase
    .from("design_pages")
    .select("design,page,kind,label")
    .eq("kind", "html");
  const seen = new Set<string>();
  const pages: PageRecord[] = [];
  for (const r of (data ?? []) as Array<{
    design: string;
    page: string;
    kind: string;
    label: string | null;
  }>) {
    const k = `${r.design}:${r.page}`;
    if (seen.has(k)) continue;
    seen.add(k);
    pages.push({ design: r.design, page: r.page, label: r.label });
  }
  pages.sort((a, b) =>
    a.design === b.design
      ? a.page.localeCompare(b.page)
      : a.design.localeCompare(b.design),
  );
  _pages = pages;
  notifyRegistry();
  return _pages;
}

export async function loadAll(): Promise<void> {
  await Promise.all([loadDesigns(), loadPagesRegistry()]);
  const { data } = await supabase.from("design_pages").select("*");
  if (!data) return;
  for (const row of data) {
    writeCache(
      {
        design: row.design as DesignKey,
        page: row.page as PageSlot,
        kind: row.kind as FileKind,
      },
      row.content,
    );
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

export async function createDesign(
  id: string,
  label: string,
): Promise<DesignRecord> {
  if (!SLUG_RE.test(id)) throw new Error("Invalid design id");
  const trimmedLabel = label.trim() || id;
  const max = _designs.reduce((m, d) => Math.max(m, d.sort_order), -1);
  const row: DesignRecord = {
    id,
    label: trimmedLabel,
    sort_order: max + 1,
  };
  const { error } = await supabase.from("designs").insert(row);
  if (error) throw error;
  // Seed a default home.html so the design has at least one page.
  await saveFile(
    { design: id, page: "home", kind: "html" },
    defaultHTML(`${trimmedLabel} — Home`),
  );
  await saveFile({ design: id, page: "shared", kind: "css" }, defaultCSS());
  await saveFile({ design: id, page: "shared", kind: "js" }, defaultJS());
  await supabase
    .from("design_pages")
    .update({ label: "Home" })
    .eq("design", id)
    .eq("page", "home")
    .eq("kind", "html");
  await Promise.all([loadDesigns(), loadPagesRegistry()]);
  return row;
}

export async function renameDesign(id: string, label: string): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Label required");
  const { error } = await supabase
    .from("designs")
    .update({ label: trimmed })
    .eq("id", id);
  if (error) throw error;
  await loadDesigns();
}

export async function deleteDesign(id: string): Promise<void> {
  await supabase.from("design_pages").delete().eq("design", id);
  const { error } = await supabase.from("designs").delete().eq("id", id);
  if (error) throw error;
  await Promise.all([loadDesigns(), loadPagesRegistry()]);
}

export async function createPage(
  design: string,
  page: string,
  label?: string,
): Promise<void> {
  if (!PAGE_SLUG_RE.test(page)) throw new Error("Invalid page id");
  if (page === "shared") throw new Error("'shared' is reserved");
  const display = (label ?? page).trim() || page;
  const { error } = await supabase.from("design_pages").upsert(
    {
      design,
      page,
      kind: "html",
      label: display,
      content: defaultHTML(display),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "design,page,kind" },
  );
  if (error) throw error;
  await loadPagesRegistry();
}

export async function renamePage(
  design: string,
  page: string,
  label: string,
): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Label required");
  const { error } = await supabase
    .from("design_pages")
    .update({ label: trimmed })
    .eq("design", design)
    .eq("page", page)
    .eq("kind", "html");
  if (error) throw error;
  await loadPagesRegistry();
}

export async function deletePage(design: string, page: string): Promise<void> {
  // Only delete the HTML row; CSS/JS are shared per design.
  const { error } = await supabase
    .from("design_pages")
    .delete()
    .eq("design", design)
    .eq("page", page)
    .eq("kind", "html");
  if (error) throw error;
  await loadPagesRegistry();
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

// ---- Realtime ----

export function subscribeDesignChanges(
  isInterested: (design: DesignKey, page: PageSlot, kind: FileKind) => boolean,
  onChange: () => void,
): RealtimeChannel {
  const ch = supabase
    .channel(`design_pages_${Math.random().toString(36).slice(2, 8)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "design_pages" },
      (payload) => {
        const row =
          (payload.new as Record<string, unknown> | null) ??
          (payload.old as Record<string, unknown> | null);
        if (!row) return;
        const design = row.design as DesignKey;
        const page = row.page as PageSlot;
        const kind = row.kind as FileKind;
        if (payload.eventType !== "DELETE" && typeof row.content === "string") {
          writeCache({ design, page, kind }, row.content);
        } else if (payload.eventType === "DELETE") {
          if (typeof window !== "undefined")
            localStorage.removeItem(CACHE_KEY({ design, page, kind }));
        }
        if (isInterested(design, page, kind)) onChange();
        // Page registry may have changed (add/rename/delete of HTML rows).
        if (kind === "html") void loadPagesRegistry();
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "designs" },
      () => {
        void loadDesigns();
      },
    )
    .subscribe();
  return ch;
}
