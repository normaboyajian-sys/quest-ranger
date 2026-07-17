import { useEffect, useRef, useState } from "react";
import {
  getDesigns,
  getDesignLogo,
  getPageIcon,
  getPagesFor,
  subscribeRegistry,
} from "@/lib/designStore";

type ActivePage = { design: string; page: string };

export function PagesEditor() {
  const [designs, setDesigns] = useState(() => getDesigns());
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState<ActivePage | null>(null);
  const activeRef = useRef<ActivePage | null>(null);
  activeRef.current = active;

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
        if (first) setActive({ design: firstDesign.id, page: first.page });
      }
    }
    const offReg = subscribeRegistry(() => setDesigns(getDesigns()));
    return () => {
      offReg();
    };
  }, []);

  const pathLabel = active
    ? `${designs.find((d) => d.id === active.design)?.label ?? active.design} / ${
        getPagesFor(active.design).find((p) => p.page === active.page)?.label ?? active.page
      }.html`
    : "Select a page";

  const previewSrc = active
    ? `/${active.design}/${active.page}?__observe=1`
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
                    const isActive =
                      !!active &&
                      active.design === folder.id &&
                      active.page === pg.page;
                    return (
                      <div key={pg.page} className="admin-pages-file-wrap">
                        <div
                          className={`admin-pages-file-row ${isActive ? "is-active" : ""}`}
                        >
                          <button
                            type="button"
                            className={`admin-pages-file ${isActive ? "is-active" : ""}`}
                            onClick={() =>
                              setActive({ design: folder.id, page: pg.page })
                            }
                            title={`/${folder.id}/${pg.page}`}
                          >
                            {(() => {
                              const pIcon =
                                getPageIcon(folder.id, pg.page) ??
                                getDesignLogo(folder.id);
                              return pIcon ? (
                                <span className="admin-pages-file-icon admin-pages-file-icon-img">
                                  <img src={pIcon} alt="" />
                                </span>
                              ) : (
                                <span className="admin-pages-file-icon">·</span>
                              );
                            })()}
                            {pg.label ?? pg.page}.html
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
          <div className="admin-pages-path">{pathLabel}</div>
        </div>
        <div className="admin-pages-preview">
          {previewSrc ? (
            <iframe
              key={previewSrc}
              title={pathLabel}
              src={previewSrc}
              className="admin-pages-preview-frame"
            />
          ) : (
            <p className="admin-pages-empty">Select a page to preview.</p>
          )}
        </div>
      </section>
    </div>
  );
}
