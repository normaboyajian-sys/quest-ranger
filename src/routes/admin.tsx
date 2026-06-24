import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  joinChannel,
  type InputPayload,
  type NavigatePayload,
} from "@/lib/orchestrator";
import {
  loadParticipants,
  markStaleParticipantsOffline,
  purgeStaleUnapproved,
  removeParticipant,
  setParticipantApproval,
  setParticipantAssignment,
  subscribeParticipants,
  type ParticipantRecord,
} from "@/lib/participantStore";
import { StatusDot, type DotState } from "@/components/StatusDot";
import { MollyLogo, type MollyLogoHandle } from "@/components/MollyLogo";
import { LivePreview } from "@/components/LivePreview";
import { PagesEditor } from "@/components/PagesEditor";

import {
  getDesigns,
  getPagesFor,
  subscribeRegistry,
  type DesignRecord,
  type PageRecord,
} from "@/lib/designStore";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Molly — Control" }] }),
  component: Admin,
});

type Suite = string;
type Page = string;
type SuiteOpt = { value: string; label: string };
type PageOpt = { value: string; label: string };

function suitesFromDesigns(designs: DesignRecord[]): SuiteOpt[] {
  return designs.map((d) => ({ value: d.id, label: d.label }));
}
function pagesFromPagesFor(pages: PageRecord[]): PageOpt[] {
  return pages.map((p) => ({ value: p.page, label: p.label ?? p.page }));
}

type LiveRecord = ParticipantRecord & { state: DotState };

function pageLabelFromUrl(url: string): string {
  const m = url.match(/^\/view\/([a-z][a-z0-9_-]{0,30})\/([a-z][a-z0-9_-]{0,40})/);
  if (!m) return url === "/" ? "Focus Room" : url;
  const designs = getDesigns();
  const design = designs.find((d) => d.id === m[1]);
  const pages = getPagesFor(m[1]);
  const page = pages.find((p) => p.page === m[2]);
  const suiteLabel = design?.label ?? m[1];
  const pageLabel = page?.label ?? m[2];
  return `${suiteLabel} · ${pageLabel}`;
}

function dotStateFor(p: ParticipantRecord | undefined): DotState {
  if (!p) return "left";
  return p.online ? "on" : "left";
}

function Admin() {
  const [records, setRecords] = useState<Map<string, LiveRecord>>(new Map());
  const [section, setSection] = useState<"queue" | "participants">("queue");
  const [nav, setNav] = useState<"participants" | "pages">("participants");
  const [events, setEvents] = useState<InputPayload[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [designs, setDesigns] = useState<DesignRecord[]>(() => getDesigns());
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("admin_sidebar_open") !== "0";
  });
  function toggleSidebar(next?: boolean) {
    setSidebarOpen((prev) => {
      const v = typeof next === "boolean" ? next : !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_sidebar_open", v ? "1" : "0");
      }
      return v;
    });
  }
  const suites = useMemo(() => suitesFromDesigns(designs), [designs]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const mollyRef = useRef<MollyLogoHandle>(null);

  async function refreshRecords() {
    const rows = await loadParticipants();
    setRecords(
      new Map(
        rows.map((row) => [
          row.id,
          {
            ...row,
            state: dotStateFor(row),
          },
        ]),
      ),
    );
  }

  useEffect(() => {
    const ch = joinChannel({
      key: `admin_${Math.random().toString(36).slice(2, 8)}`,
      onInput: (p) => setEvents((prev) => [p, ...prev].slice(0, 200)),
    });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        subscribedRef.current = true;
        await ch.track({ admin: true });
      }
    });
    channelRef.current = ch;

    void refreshRecords();
    const participantChannel = subscribeParticipants(() => void refreshRecords());

    // Keep accepted participants forever; flip stale online users red and
    // auto-purge unapproved queue entries that have gone quiet.
    const sweeper = window.setInterval(() => {
      void Promise.all([
        markStaleParticipantsOffline().catch(() => undefined),
        purgeStaleUnapproved().catch(() => undefined),
      ]).then(() => refreshRecords()).catch(() => undefined);
    }, 5_000);
    // Safety: full refresh in case a realtime event was dropped.
    const safety = window.setInterval(() => {
      void refreshRecords().catch(() => undefined);
    }, 10_000);
    return () => {
      subscribedRef.current = false;
      window.clearInterval(sweeper);
      window.clearInterval(safety);
      void participantChannel.unsubscribe();
      void ch.unsubscribe();
    };
  }, []);

  // Load designs registry for the redirect selectors + page labels
  useEffect(() => {
    setDesigns(getDesigns());
    const off = subscribeRegistry(() => setDesigns(getDesigns()));
    return off;
  }, []);

  async function broadcast(event: string, payload: unknown, retries = 3) {
    const ch = channelRef.current;
    if (!ch) return;
    for (let i = 0; i < retries; i++) {
      if (subscribedRef.current) {
        try {
          const res = await ch.send({ type: "broadcast", event, payload });
          if (res === "ok") return;
        } catch {
          /* retry */
        }
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  async function sendNavigate(id: string, suite: Suite, page: Page) {
    const url = `/view/${suite}/${page}`;
    await setParticipantAssignment(id, url);
    const payload: NavigatePayload = { targets: [id], url };
    void broadcast("navigate", payload);
  }


  function kick(id: string) {
    void broadcast("revoke", { id });
    void removeParticipant(id).then(refreshRecords);
    setPreviews((p) => p.filter((x) => x !== id));
  }


  function approve(id: string, suite: Suite, page: Page) {
    const url = `/view/${suite}/${page}`;
    void setParticipantApproval(id, true, url).then(() => {
      void refreshRecords();
      void broadcast("approve", { id });
      setTimeout(() => void sendNavigate(id, suite, page), 200);
    });
    setRecords((prev) => {
      const r = prev.get(id);
      if (!r) return prev;
      const next = new Map(prev);
      next.set(id, { ...r, approved: true, assignedUrl: url, currentUrl: url });
      return next;
    });
  }

  function revoke(id: string) {
    void broadcast("revoke", { id });
    void setParticipantApproval(id, false, null).then(refreshRecords);
    setRecords((prev) => {
      const r = prev.get(id);
      if (!r) return prev;
      const next = new Map(prev);
      next.set(id, { ...r, approved: false, assignedUrl: null, currentUrl: "/" });
      return next;
    });
    setPreviews((p) => p.filter((x) => x !== id));
  }

  function openPreview(id: string) {
    setPreviews((p) => (p.includes(id) ? p : [...p, id]));
  }
  function closePreview(id: string) {
    setPreviews((p) => p.filter((x) => x !== id));
  }

  const list = useMemo(
    () => Array.from(records.values()).sort((a, b) => a.joinedAt - b.joinedAt),
    [records],
  );
  const queue = list.filter((r) => !r.approved);
  const approved = list.filter((r) => r.approved);

  return (
    <div className="admin-noir min-h-screen">
      <div
        className={`admin-shell ${sidebarOpen ? "is-open" : "is-collapsed"} chat-closed`}
      >
        <aside className="admin-sidebar">
          <div className="admin-sidebar-head">
            <button
              type="button"
              className="admin-brand-btn"
              onMouseEnter={() => mollyRef.current?.play()}
              onClick={() => toggleSidebar()}
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <span className="admin-avatar">
                <MollyLogo ref={mollyRef} size={28} />
              </span>
              <span className="admin-brand-name">Molly</span>
            </button>
            <div className="admin-sidebar-head-actions">
              <button
                type="button"
                className="admin-icon-btn"
                title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                aria-label="Toggle sidebar"
                onClick={() => toggleSidebar()}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M9 4v16" />
                </svg>
              </button>
            </div>
          </div>
          <nav className="admin-nav">
            <button
              type="button"
              className={`admin-nav-item ${nav === "participants" ? "is-active" : ""}`}
              aria-current={nav === "participants" ? "page" : undefined}
              onClick={() => setNav("participants")}
              title="Participants"
            >
              <span className="admin-nav-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </span>
              <span className="admin-nav-label">Participants</span>
              <span className="admin-count">{list.length}</span>
            </button>
            <button
              type="button"
              className={`admin-nav-item ${nav === "pages" ? "is-active" : ""}`}
              aria-current={nav === "pages" ? "page" : undefined}
              onClick={() => setNav("pages")}
              title="Pages"
            >
              <span className="admin-nav-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h10l6 6v10a0 0 0 0 1 0 0H4z" />
                  <path d="M14 4v6h6" />
                </svg>
              </span>
              <span className="admin-nav-label">Pages</span>
            </button>
          </nav>
        </aside>

        <main className="admin-main">


          {nav === "participants" ? (
            <>
              <div className="admin-segmented-wrap">
                <div className="admin-segmented" role="tablist">
                  <button
                    role="tab"
                    aria-selected={section === "queue"}
                    className={`admin-seg ${section === "queue" ? "is-active" : ""}`}
                    onClick={() => setSection("queue")}
                  >
                    Queue <span className="admin-seg-count">{queue.length}</span>
                  </button>
                  <button
                    role="tab"
                    aria-selected={section === "participants"}
                    className={`admin-seg ${section === "participants" ? "is-active" : ""}`}
                    onClick={() => setSection("participants")}
                  >
                    Participants <span className="admin-seg-count">{approved.length}</span>
                  </button>
                </div>
              </div>
              <div key={section} className="admin-pane admin-pane-swap">
                {section === "queue" ? (
                  <QueuePane items={queue} onApprove={approve} suites={suites} />
                ) : (
                  <ParticipantsPane
                    items={approved}
                    onNavigate={sendNavigate}
                    onRevoke={revoke}
                    onKick={kick}
                    onOpenPreview={openPreview}
                    events={events}
                    suites={suites}
                  />
                )}
              </div>
            </>
          ) : (
            <div key="pages" className="admin-pane admin-pane-swap">
              <PagesEditor />
            </div>
          )}
        </main>

      </div>


      {previews.map((pid, i) => (
        <LivePreview
          key={pid}
          pid={pid}
          onClose={() => closePreview(pid)}
          initial={{
            pos: { x: 80 + i * 40, y: 80 + i * 40 },
            size: { w: 480, h: 360 },
          }}
        />
      ))}
    </div>
  );
}

function QueuePane({
  items,
  onApprove,
  suites,
}: {
  items: LiveRecord[];
  onApprove: (id: string, suite: Suite, page: Page) => void;
  suites: SuiteOpt[];
}) {
  if (items.length === 0) {
    return <p className="admin-empty">No one waiting. New participants will appear here for approval.</p>;
  }
  return (
    <div className="admin-grid">
      {items.map((p) => (
        <QueueCard key={p.id} p={p} onApprove={onApprove} suites={suites} />
      ))}
    </div>
  );
}

function QueueCard({
  p,
  onApprove,
  suites,
}: {
  p: LiveRecord;
  onApprove: (id: string, suite: Suite, page: Page) => void;
  suites: SuiteOpt[];
}) {
  const [open, setOpen] = useState(false);
  const [suite, setSuite] = useState<Suite>(() => suites[0]?.value ?? "");
  const pageOpts: PageOpt[] = useMemo(
    () => (suite ? pagesFromPagesFor(getPagesFor(suite)) : []),
    [suite],
  );
  const [page, setPage] = useState<Page>(() => pageOpts[0]?.value ?? "");
  // Keep selections valid when suite/page lists change
  useEffect(() => {
    if (!suite && suites[0]) setSuite(suites[0].value);
  }, [suites, suite]);
  useEffect(() => {
    if (!pageOpts.find((o) => o.value === page)) {
      setPage(pageOpts[0]?.value ?? "");
    }
  }, [pageOpts, page]);

  return (
    <article className="admin-card">
      <div className="admin-card-head">
        <div className="admin-card-id">
          <StatusDot state={p.state} />
          <span className="font-mono text-sm">{p.id}</span>
        </div>
        <span className="admin-tag">Awaiting</span>
      </div>
      <p className="admin-card-page">on · {pageLabelFromUrl(p.currentUrl)}</p>

      <div className={`admin-popout ${open ? "is-open" : ""}`}>
        <div className="admin-popout-inner">
          <label className="admin-field">
            <span>Design Suite</span>
            <select value={suite} onChange={(e) => setSuite(e.target.value)}>
              {suites.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Starting Page</span>
            <select value={page} onChange={(e) => setPage(e.target.value)}>
              {pageOpts.map((pg) => (
                <option key={pg.value} value={pg.value}>
                  {pg.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="admin-btn admin-btn-primary w-full"
            onClick={() => suite && page && onApprove(p.id, suite, page)}
            disabled={!suite || !page}
          >
            Confirm & route
          </button>
        </div>
      </div>

      <div className="admin-card-actions">
        <button className="admin-btn admin-btn-primary" onClick={() => setOpen((v) => !v)}>
          {open ? "Cancel" : "Accept"}
        </button>
      </div>
    </article>
  );
}

function ParticipantsPane({
  items,
  onNavigate,
  onRevoke,
  onKick,
  onOpenPreview,
  events,
  suites,
}: {
  items: LiveRecord[];
  onNavigate: (id: string, suite: Suite, page: Page) => void;
  onRevoke: (id: string) => void;
  onKick: (id: string) => void;
  onOpenPreview: (id: string) => void;
  events: InputPayload[];
  suites: SuiteOpt[];
}) {
  const ids = new Set(items.map((i) => i.id));
  const filteredEvents = events.filter((e) => ids.has(e.participantId));
  return (
    <div className="admin-pane-split">
      <div>
        {items.length === 0 ? (
          <p className="admin-empty">No approved participants yet. Approve from the Queue.</p>
        ) : (
          <div className="admin-grid">
            {items.map((p) => (
              <ParticipantCard
                key={p.id}
                p={p}
                onNavigate={onNavigate}
                onRevoke={onRevoke}
                onKick={onKick}
                onOpenPreview={onOpenPreview}
                suites={suites}
              />
            ))}
          </div>
        )}
      </div>

      <aside className="admin-feed">
        <h2 className="admin-section-label">Interaction Feed</h2>
        <div className="admin-feed-list">
          {filteredEvents.length === 0 && (
            <p className="admin-empty">Waiting for input events. Password fields are excluded.</p>
          )}
          {filteredEvents.map((e, i) => (
            <div key={i} className="admin-feed-item">
              <div className="admin-feed-row">
                <span className="font-mono text-xs">{e.participantId}</span>
                <span className="admin-feed-time">{new Date(e.at).toLocaleTimeString()}</span>
              </div>
              <div className="admin-feed-body">
                <span className="text-zinc-500">{e.field}:</span>{" "}
                <span>{e.value || <em className="text-zinc-600">(empty)</em>}</span>
              </div>
              <div className="admin-feed-url">{e.url}</div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function ParticipantCard({
  p,
  onNavigate,
  onRevoke,
  onKick,
  onOpenPreview,
  suites,
}: {
  p: LiveRecord;
  onNavigate: (id: string, suite: Suite, page: Page) => void;
  onRevoke: (id: string) => void;
  onKick: (id: string) => void;
  onOpenPreview: (id: string) => void;
  suites: SuiteOpt[];
}) {
  const [suite, setSuite] = useState<Suite>(() => suites[0]?.value ?? "");
  const pageOpts: PageOpt[] = useMemo(
    () => (suite ? pagesFromPagesFor(getPagesFor(suite)) : []),
    [suite],
  );
  const [page, setPage] = useState<Page>(() => pageOpts[0]?.value ?? "");
  useEffect(() => {
    if (!suite && suites[0]) setSuite(suites[0].value);
  }, [suites, suite]);
  useEffect(() => {
    if (!pageOpts.find((o) => o.value === page)) {
      setPage(pageOpts[0]?.value ?? "");
    }
  }, [pageOpts, page]);

  return (
    <article className="admin-card">
      <div className="admin-card-head">
        <div className="admin-card-id">
          <StatusDot state={p.state} />
          <span className="font-mono text-sm">{p.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`admin-tag ${p.online ? "admin-tag-live" : "admin-tag-offline"}`}>
            {p.online ? "Online" : "Offline"}
          </span>
          <button
            className="admin-icon-btn"
            title="Live preview"
            onClick={() => onOpenPreview(p.id)}
            aria-label="Open live preview"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </div>
      <p className="admin-card-page">on · {pageLabelFromUrl(p.currentUrl)}</p>

      <div className="admin-row">
        <select value={suite} onChange={(e) => setSuite(e.target.value)} className="admin-select">
          {suites.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select value={page} onChange={(e) => setPage(e.target.value)} className="admin-select">
          {pageOpts.map((pg) => (
            <option key={pg.value} value={pg.value}>
              {pg.label}
            </option>
          ))}
        </select>
        <button
          className="admin-btn admin-btn-primary"
          onClick={() => suite && page && onNavigate(p.id, suite, page)}
          disabled={!suite || !page}
        >
          Redirect
        </button>
      </div>

      <div className="admin-card-actions">
        <button className="admin-btn admin-btn-ghost" onClick={() => onRevoke(p.id)}>
          Revoke access
        </button>
        <button className="admin-btn admin-btn-ghost" onClick={() => onKick(p.id)}>
          Remove
        </button>
      </div>
    </article>
  );
}
