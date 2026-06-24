import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  joinChannel,
  type InputPayload,
  type NavigatePayload,
  type ParticipantPresence,
} from "@/lib/orchestrator";
import { StatusDot, type DotState } from "@/components/StatusDot";
import { MollyLogo, type MollyLogoHandle } from "@/components/MollyLogo";
import { LivePreview } from "@/components/LivePreview";
import { PagesEditor } from "@/components/PagesEditor";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Molly — Control" }] }),
  component: Admin,
});

const SUITES = [
  { value: "red", label: "Industrial Red" },
  { value: "blue", label: "Modern Blue" },
] as const;
const PAGES = [
  { value: "home", label: "Home" },
  { value: "contact", label: "Contact" },
] as const;

type Suite = (typeof SUITES)[number]["value"];
type Page = (typeof PAGES)[number]["value"];

type LiveRecord = ParticipantPresence & { lastSeen: number; state: DotState };

function pageLabelFromUrl(url: string): string {
  const m = url.match(/^\/view\/(red|blue)\/(home|contact)/);
  if (!m) return url === "/" ? "Focus Room" : url;
  const suite = m[1] === "red" ? "Industrial Red" : "Modern Blue";
  const page = m[2] === "home" ? "Home" : "Contact";
  return `${suite} · ${page}`;
}

function dotStateFor(p: ParticipantPresence | undefined): DotState {
  if (!p) return "left";
  if (p.currentUrl.startsWith("/view/")) return "on";
  return "off";
}

function Admin() {
  const [records, setRecords] = useState<Map<string, LiveRecord>>(new Map());
  const [section, setSection] = useState<"queue" | "participants">("queue");
  const [nav, setNav] = useState<"participants" | "pages">("participants");
  const [events, setEvents] = useState<InputPayload[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const mollyRef = useRef<MollyLogoHandle>(null);

  useEffect(() => {
    const ch = joinChannel({
      key: `admin_${Math.random().toString(36).slice(2, 8)}`,
      onSync: (state) => {
        const now = Date.now();
        const seen = new Set<string>();
        const fresh = new Map<string, ParticipantPresence>();
        for (const arr of Object.values(state)) {
          for (const p of arr) {
            const pres = p as Partial<ParticipantPresence>;
            if (!pres.id) continue;
            seen.add(pres.id);
            fresh.set(pres.id, {
              id: pres.id,
              currentUrl: pres.currentUrl ?? "/",
              joinedAt: pres.joinedAt ?? now,
              approved: !!pres.approved,
            });
          }
        }
        setRecords((prev) => {
          const next = new Map<string, LiveRecord>();
          for (const [id, p] of fresh) {
            const old = prev.get(id);
            next.set(id, {
              ...p,
              lastSeen: now,
              state: dotStateFor(p),
              joinedAt: old?.joinedAt ?? p.joinedAt,
            });
          }
          return next;
        });
      },
      onInput: (p) => setEvents((prev) => [p, ...prev].slice(0, 200)),
    });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        subscribedRef.current = true;
        await ch.track({ admin: true });
      }
    });
    channelRef.current = ch;
    return () => {
      subscribedRef.current = false;
      void ch.unsubscribe();
    };
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

  function sendNavigate(id: string, suite: Suite, page: Page) {
    const url = `/view/${suite}/${page}`;
    const payload: NavigatePayload = { targets: [id], url };
    void broadcast("navigate", payload);
  }


  function kick(id: string) {
    void broadcast("revoke", { id });
    setRecords((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setPreviews((p) => p.filter((x) => x !== id));
  }


  function approve(id: string, suite: Suite, page: Page) {
    void broadcast("approve", { id }).then(() => {
      setTimeout(() => sendNavigate(id, suite, page), 200);
    });
    // optimistic local flag
    setRecords((prev) => {
      const r = prev.get(id);
      if (!r) return prev;
      const next = new Map(prev);
      next.set(id, { ...r, approved: true });
      return next;
    });
  }

  function revoke(id: string) {
    void broadcast("revoke", { id });
    setRecords((prev) => {
      const r = prev.get(id);
      if (!r) return prev;
      const next = new Map(prev);
      next.set(id, { ...r, approved: false, currentUrl: "/", state: "off" });
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
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand" onMouseEnter={() => mollyRef.current?.play()}>
            <MollyLogo ref={mollyRef} size={36} />
            <div className="admin-brand-name">Molly</div>
          </div>
          <nav className="admin-nav">
            <button
              type="button"
              className={`admin-nav-item ${nav === "participants" ? "is-active" : ""}`}
              aria-current={nav === "participants" ? "page" : undefined}
              onClick={() => setNav("participants")}
            >
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                Participants
              </span>
              <span className="admin-count">{list.length}</span>
            </button>
            <button
              type="button"
              className={`admin-nav-item ${nav === "pages" ? "is-active" : ""}`}
              aria-current={nav === "pages" ? "page" : undefined}
              onClick={() => setNav("pages")}
            >
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h10l6 6v10a0 0 0 0 1 0 0H4z" />
                  <path d="M14 4v6h6" />
                </svg>
                Pages
              </span>
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
                  <QueuePane items={queue} onApprove={approve} />
                ) : (
                  <ParticipantsPane
                    items={approved}
                    onNavigate={sendNavigate}
                    onRevoke={revoke}
                    onKick={kick}
                    onOpenPreview={openPreview}
                    events={events}
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
}: {
  items: LiveRecord[];
  onApprove: (id: string, suite: Suite, page: Page) => void;
}) {
  if (items.length === 0) {
    return <p className="admin-empty">No one waiting. New participants will appear here for approval.</p>;
  }
  return (
    <div className="admin-grid">
      {items.map((p) => (
        <QueueCard key={p.id} p={p} onApprove={onApprove} />
      ))}
    </div>
  );
}

function QueueCard({
  p,
  onApprove,
}: {
  p: LiveRecord;
  onApprove: (id: string, suite: Suite, page: Page) => void;
}) {
  const [open, setOpen] = useState(false);
  const [suite, setSuite] = useState<Suite>("red");
  const [page, setPage] = useState<Page>("home");

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
            <select value={suite} onChange={(e) => setSuite(e.target.value as Suite)}>
              {SUITES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Starting Page</span>
            <select value={page} onChange={(e) => setPage(e.target.value as Page)}>
              {PAGES.map((pg) => (
                <option key={pg.value} value={pg.value}>
                  {pg.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="admin-btn admin-btn-primary w-full"
            onClick={() => onApprove(p.id, suite, page)}
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
}: {
  items: LiveRecord[];
  onNavigate: (id: string, suite: Suite, page: Page) => void;
  onRevoke: (id: string) => void;
  onKick: (id: string) => void;
  onOpenPreview: (id: string) => void;
  events: InputPayload[];
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
}: {
  p: LiveRecord;
  onNavigate: (id: string, suite: Suite, page: Page) => void;
  onRevoke: (id: string) => void;
  onKick: (id: string) => void;
  onOpenPreview: (id: string) => void;
}) {
  const [suite, setSuite] = useState<Suite>("red");
  const [page, setPage] = useState<Page>("home");

  return (
    <article className="admin-card">
      <div className="admin-card-head">
        <div className="admin-card-id">
          <StatusDot state={p.state} />
          <span className="font-mono text-sm">{p.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="admin-tag admin-tag-live">
            {p.state === "on" ? "On site" : p.state === "off" ? "Focus" : "Left"}
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
        <select value={suite} onChange={(e) => setSuite(e.target.value as Suite)} className="admin-select">
          {SUITES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select value={page} onChange={(e) => setPage(e.target.value as Page)} className="admin-select">
          {PAGES.map((pg) => (
            <option key={pg.value} value={pg.value}>
              {pg.label}
            </option>
          ))}
        </select>
        <button className="admin-btn admin-btn-primary" onClick={() => onNavigate(p.id, suite, page)}>
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
