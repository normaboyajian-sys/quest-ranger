// DB-backed editable HTML/CSS/JS for each design + page.
// Stored in public.design_pages, mirrored locally for instant reads, updated
// live via Supabase Realtime so every viewer/admin sees changes immediately.

import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type DesignKey = "red" | "blue";
export type PageKey = "home" | "contact";
export type FileKind = "html" | "css" | "js";
export type PageSlot = PageKey | "shared";

export type DesignFile = {
  design: DesignKey;
  page: PageSlot;
  kind: FileKind;
};

const CACHE_KEY = (f: DesignFile) => `design:${f.design}:${f.page}:${f.kind}`;

const DEFAULT_FILES: DesignFile[] = [
  { design: "red", page: "home", kind: "html" },
  { design: "red", page: "contact", kind: "html" },
  { design: "red", page: "shared", kind: "css" },
  { design: "red", page: "shared", kind: "js" },
  { design: "blue", page: "home", kind: "html" },
  { design: "blue", page: "contact", kind: "html" },
  { design: "blue", page: "shared", kind: "css" },
  { design: "blue", page: "shared", kind: "js" },
];

export const PAGE_LINKS = [
  { design: "red", page: "home", label: "Industrial Red / Home", url: "/view/red/home" },
  { design: "red", page: "contact", label: "Industrial Red / Contact", url: "/view/red/contact" },
  { design: "blue", page: "home", label: "Modern Blue / Home", url: "/view/blue/home" },
  { design: "blue", page: "contact", label: "Modern Blue / Contact", url: "/view/blue/contact" },
] as const;

export const DESIGN_LABELS: Record<DesignKey, string> = {
  red: "Industrial Red",
  blue: "Modern Blue",
};

export const PAGE_LABELS: Record<PageKey, string> = {
  home: "Home",
  contact: "Contact",
};

const RED_VARS = `--bg:#0c0a09;--fg:#fafaf9;--mut:#a8a29e;--card:#1c1917;--bd:#292524;--acc:#ef4444;`;
const BLUE_VARS = `--bg:#0b1220;--fg:#e6eefc;--mut:#94a3b8;--card:#111a2e;--bd:#1e293b;--acc:#3b82f6;`;

function sharedCSS(design: DesignKey): string {
  const vars = design === "red" ? RED_VARS : BLUE_VARS;
  return `:root{${vars}}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--fg);font-family:ui-sans-serif,system-ui,sans-serif}
header{display:flex;justify-content:space-between;align-items:center;padding:20px 32px;border-bottom:1px solid var(--bd)}
.brand{display:flex;align-items:center;gap:12px;font-weight:600}
.mark{width:22px;height:22px;border-radius:6px;background:var(--acc)}
nav{display:flex;gap:24px;font-size:14px;opacity:.9}
main{max-width:720px;margin:0 auto;padding:64px 32px}
h1{font-size:44px;line-height:1.05;letter-spacing:-.02em;margin:0}
.sub{margin:16px 0 0;color:var(--mut);font-size:18px}
.card{margin-top:40px;background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:24px;display:flex;flex-direction:column;gap:16px}
label{display:block}
.label{font-size:12px;color:var(--mut);text-transform:uppercase;letter-spacing:.08em}
input,textarea{margin-top:8px;width:100%;background:transparent;border:1px solid var(--bd);color:var(--fg);border-radius:10px;padding:12px 14px;font:inherit;outline:none}
input:focus,textarea:focus{border-color:var(--acc)}
button.cta{background:var(--acc);color:#fff;border:0;border-radius:10px;padding:12px 16px;font-weight:600;cursor:pointer}
`;
}

function sharedJS(): string {
  return `// Runs once on page load inside the participant iframe.
// Use track(field, value) to record an input event in the admin feed.
document.addEventListener('input', (e) => {
  const t = e.target;
  if (!t || !t.name) return;
  if (t.type === 'password') return;
  track(t.name, t.value);
});
`;
}

function homeHTML(design: DesignKey): string {
  const brand = design === "red" ? "FORGE" : "Lumen";
  const h1 = design === "red" ? "Built for impact." : "Designed to feel weightless.";
  const sub =
    design === "red"
      ? "Industrial-grade tooling for teams who ship."
      : "A calmer surface for the work that matters.";
  return `<header>
  <div class="brand"><span class="mark"></span><span>${brand}</span></div>
  <nav><span>● Home</span><span>Contact</span></nav>
</header>
<main>
  <h1>${h1}</h1>
  <p class="sub">${sub}</p>
  <div class="card">
    <label><span class="label">Search</span>
      <input name="search" placeholder="What are you looking for?" />
    </label>
    <label><span class="label">Username</span>
      <input name="username" />
    </label>
    <label><span class="label">Password (not tracked)</span>
      <input type="password" name="password" />
    </label>
  </div>
</main>`;
}

function contactHTML(design: DesignKey): string {
  const brand = design === "red" ? "FORGE" : "Lumen";
  const h1 = design === "red" ? "Send a transmission." : "Say hello.";
  const sub =
    design === "red" ? "We respond within 24 hours." : "We'd love to hear from you.";
  const cta = design === "red" ? "Transmit" : "Send message";
  return `<header>
  <div class="brand"><span class="mark"></span><span>${brand}</span></div>
  <nav><span>Home</span><span>● Contact</span></nav>
</header>
<main>
  <h1>${h1}</h1>
  <p class="sub">${sub}</p>
  <div class="card">
    <label><span class="label">Email</span>
      <input name="email" />
    </label>
    <label><span class="label">Feedback</span>
      <textarea name="feedback" rows="5"></textarea>
    </label>
    <button class="cta" type="button">${cta}</button>
  </div>
</main>`;
}

export function defaultContent(f: DesignFile): string {
  if (f.kind === "css") return sharedCSS(f.design);
  if (f.kind === "js") return sharedJS();
  if (f.page === "home") return homeHTML(f.design);
  if (f.page === "contact") return contactHTML(f.design);
  return "";
}

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

/** Synchronous read from cache, falls back to bundled default. */
export function loadFileCached(f: DesignFile): string {
  return readCache(f) ?? defaultContent(f);
}

/** Async read from DB, refreshes cache. */
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

export async function ensureDefaultDesignPages(): Promise<void> {
  const { data } = await supabase.from("design_pages").select("design,page,kind");
  const existing = new Set((data ?? []).map((r) => `${r.design}:${r.page}:${r.kind}`));
  const missing = DEFAULT_FILES.filter((f) => !existing.has(`${f.design}:${f.page}:${f.kind}`));
  if (missing.length === 0) return;
  const { error } = await supabase.from("design_pages").insert(
    missing.map((f) => ({
      design: f.design,
      page: f.page,
      kind: f.kind,
      content: defaultContent(f),
    })),
  );
  if (error && error.code !== "23505") throw error;
}

/** Save to DB (upsert). Triggers realtime fan-out. */
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

/** Delete the override so the bundled default takes over again. */
export async function resetFile(f: DesignFile): Promise<void> {
  await saveFile(f, defaultContent(f));
}

/** Load all rows once and refresh the local cache. */
export async function loadAll(): Promise<void> {
  await ensureDefaultDesignPages();
  const { data } = await supabase.from("design_pages").select("*");
  if (!data) return;
  for (const row of data) {
    writeCache(
      { design: row.design as DesignKey, page: row.page as PageSlot, kind: row.kind as FileKind },
      row.content,
    );
  }
}

/** Synchronous srcDoc using whatever is currently cached. */
export function buildSrcDocCached(design: DesignKey, page: PageKey): string {
  const html = loadFileCached({ design, page, kind: "html" });
  const css = loadFileCached({ design, page: "shared", kind: "css" });
  const js = loadFileCached({ design, page: "shared", kind: "js" });
  return wrap(html, css, js);
}

function wrap(html: string, css: string, js: string): string {
  return `<!doctype html><html><head><meta charset="utf-8" />
<style>${css}</style></head><body>${html}
<script>
window.track = function(field, value){
  try { parent.postMessage({__ux:true, type:'input', field, value}, '*'); } catch(e){}
};
window.addEventListener('click', function(e){
  try { parent.postMessage({__ux:true, type:'click', x:e.clientX, y:e.clientY, w:innerWidth, h:innerHeight}, '*'); } catch(e){}
});
window.addEventListener('mousemove', function(e){
  try { parent.postMessage({__ux:true, type:'mouse', x:e.clientX, y:e.clientY, w:innerWidth, h:innerHeight}, '*'); } catch(e){}
}, {passive:true});
window.addEventListener('scroll', function(){
  try { parent.postMessage({__ux:true, type:'scroll', sx:scrollX, sy:scrollY}, '*'); } catch(e){}
}, {passive:true});
${js}
<\/script>
</body></html>`;
}

/**
 * Subscribe to all design_pages changes; cache stays fresh and `onChange`
 * fires whenever the visible (design,page) is affected.
 */
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
      },
    )
    .subscribe();
  return ch;
}
