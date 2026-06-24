import { useMemo, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import CodeMirror from "@uiw/react-codemirror";
import { html as htmlLang } from "@codemirror/lang-html";
import { css as cssLang } from "@codemirror/lang-css";
import { javascript as jsLang } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  DESIGN_LABELS,
  PAGE_LABELS,
  defaultContent,
  exportBundle,
  loadFile,
  resetFile,
  saveFile,
  type DesignFile,
  type DesignKey,
  type PageKey,
} from "@/lib/designStore";
import type { DesignPublishPayload } from "@/lib/orchestrator";

type Node =
  | { kind: "folder"; design: DesignKey; label: string; children: Node[] }
  | { kind: "file"; file: DesignFile; label: string };

function buildTree(): Node[] {
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

export function PagesEditor({
  channel,
  subscribedRef,
}: {
  channel: RealtimeChannel | null;
  subscribedRef: React.MutableRefObject<boolean>;
}) {
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
  const [content, setContent] = useState<string>(() => loadFile(active));
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string>("");

  function openFile(f: DesignFile) {
    setActive(f);
    setContent(loadFile(f));
    setDirty(false);
    setStatus("");
  }

  async function publish(design: DesignKey, pages: PageKey[]) {
    if (!channel) return;
    for (const page of pages) {
      const b = exportBundle(design, page);
      const payload: DesignPublishPayload = { ...b, at: Date.now() };
      if (subscribedRef.current) {
        try {
          await channel.send({ type: "broadcast", event: "design_publish", payload });
        } catch {
          /* ignore */
        }
      }
    }
  }

  async function onSave() {
    saveFile(active, content);
    setDirty(false);
    setStatus("Saved · publishing…");
    const pages: PageKey[] =
      active.page === "shared" ? ["home", "contact"] : [active.page];
    await publish(active.design, pages);
    setStatus("Saved & published");
    setTimeout(() => setStatus(""), 1500);
  }

  function onReset() {
    resetFile(active);
    setContent(defaultContent(active));
    setDirty(true);
    setStatus("Reset (not saved)");
  }

  const extension =
    active.kind === "html" ? [htmlLang()] : active.kind === "css" ? [cssLang()] : [jsLang()];

  const pathLabel = `${DESIGN_LABELS[active.design]} / ${
    active.page === "shared"
      ? active.kind === "css"
        ? "styles.css"
        : "script.js"
      : `${PAGE_LABELS[active.page]} .html`
  }`;

  return (
    <div className="admin-pages">
      <aside className="admin-pages-tree">
        <div className="admin-pages-tree-head">Designs</div>
        {tree.map((folder) => {
          if (folder.kind !== "folder") return null;
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
                    if (c.kind !== "file") return null;
                    const isActive =
                      c.file.design === active.design &&
                      c.file.page === active.page &&
                      c.file.kind === active.kind;
                    return (
                      <button
                        key={c.label}
                        className={`admin-pages-file ${isActive ? "is-active" : ""}`}
                        onClick={() => openFile(c.file)}
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
          <div className="admin-pages-path">{pathLabel}{dirty ? " ·" : ""}</div>
          <div className="admin-pages-actions">
            {status && <span className="admin-pages-status">{status}</span>}
            <button className="admin-btn admin-btn-ghost" onClick={onReset}>
              Reset
            </button>
            <button className="admin-btn admin-btn-primary" onClick={onSave}>
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
