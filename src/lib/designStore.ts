// Stores editable HTML/CSS/JS for each design + page in localStorage.
// Broadcasts updates so participants render the latest version live.

export type DesignKey = "red" | "blue";
export type PageKey = "home" | "contact";
export type FileKind = "html" | "css" | "js";

export type DesignFile = {
  design: DesignKey;
  page: PageKey | "shared";
  kind: FileKind;
};

const KEY = (f: DesignFile) => `design:${f.design}:${f.page}:${f.kind}`;

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
  return `// Available globally. Runs once on page load.
// Use track(field, value) to record an input.
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
  const h1 =
    design === "red" ? "Built for impact." : "Designed to feel weightless.";
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
    design === "red"
      ? "We respond within 24 hours."
      : "We'd love to hear from you.";
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
  return contactHTML(f.design);
}

export function loadFile(f: DesignFile): string {
  if (typeof window === "undefined") return defaultContent(f);
  const v = localStorage.getItem(KEY(f));
  return v ?? defaultContent(f);
}

export function saveFile(f: DesignFile, content: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY(f), content);
}

export function resetFile(f: DesignFile) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY(f));
}

export function buildSrcDoc(design: DesignKey, page: PageKey): string {
  const html = loadFile({ design, page, kind: "html" });
  const css = loadFile({ design, page: "shared", kind: "css" });
  const js = loadFile({ design, page: "shared", kind: "js" });
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
${js}
<\/script>
</body></html>`;
}

export type DesignBundle = {
  design: DesignKey;
  page: PageKey;
  html: string;
  css: string;
  js: string;
};

export function exportBundle(design: DesignKey, page: PageKey): DesignBundle {
  return {
    design,
    page,
    html: loadFile({ design, page, kind: "html" }),
    css: loadFile({ design, page: "shared", kind: "css" }),
    js: loadFile({ design, page: "shared", kind: "js" }),
  };
}

export function applyBundle(b: DesignBundle) {
  saveFile({ design: b.design, page: b.page, kind: "html" }, b.html);
  saveFile({ design: b.design, page: "shared", kind: "css" }, b.css);
  saveFile({ design: b.design, page: "shared", kind: "js" }, b.js);
}
