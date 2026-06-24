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

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Management Dashboard — Orchestrator" }],
  }),
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

const LEFT_GRACE_MS = 20_000;

function pageLabelFromUrl(url: string): string {
  const m = url.match(/^\/view\/(red|blue)\/(home|contact)/);
  if (!m) return url === "/" ? "Focus Room" : url;
  const suite = m[1] === "red" ? "Industrial Red" : "Modern Blue";
  const page = m[2] === "home" ? "Home" : "Contact";
  return `${suite} · ${page}`;
}

function dotStateFor(p: ParticipantPresence | undefined, present: boolean): DotState {
  if (!present) return "left";
  if (p && p.currentUrl.startsWith("/view/")) return "on";
  return "off";
}

function Admin() {
  const [records, setRecords] = useState<Map<string, LiveRecord>>(new Map());
  const [tab, setTab] = useState<"queue" | "participants">("queue");
  const [events, setEvents] = useState<InputPayload[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

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
          const next = new Map(prev);
          // upsert present
          for (const [id, p] of fresh) {
            next.set(id, { ...p, lastSeen: now, state: dotStateFor(p, true) });
          }
          // mark missing as left
          for (const [id, rec] of next) {
            if (!seen.has(id)) {
              if (now - rec.lastSeen > LEFT_GRACE_MS) {
                next.delete(id);
              } else {
                next.set(id, { ...rec, state: "left" });
              }
            }
          }
          return next;
        });
      },
      onInput: (p) => setEvents((prev) => [p, ...prev].slice(0, 200)),
    });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ admin: true });
    });
    channelRef.current = ch;

    // periodic prune of left cards
    const interval = setInterval(() => {
      setRecords((prev) => {
        const now = Date.now();
        const next = new Map(prev);
        for (const [id, rec] of next) {
          if (rec.state === "left" && now - rec.lastSeen > LEFT_GRACE_MS) {
            next.delete(id);
          }
        }
        return next;
      });
    }, 3000);

    return () => {
      clearInterval(interval);
      void ch.unsubscribe();
    };
  }, []);

  function sendNavigate(id: string, suite: Suite, page: Page) {
    const ch = channelRef.current;
    if (!ch) return;
    const payload: NavigatePayload = { targets: [id], url: `/view/${suite}/${page}` };
    void ch.send({ type: "broadcast", event: "navigate", payload });
  }

  function approve(id: string, suite: Suite, page: Page) {
    const ch = channelRef.current;
    if (!ch) return;
    void ch.send({ type: "broadcast", event: "approve", payload: { id } });
    // small delay so client applies approval before navigating
    setTimeout(() => sendNavigate(id, suite, page), 250);
  }

  function revoke(id: string) {
    const ch = channelRef.current;
    if (!ch) return;
    void ch.send({ type: "broadcast", event: "revoke", payload: { id } });
  }

  const list = useMemo(() => Array.from(records.values()).sort((a, b) => a.joinedAt - b.joinedAt), [records]);
  const queue = list.filter((r) => !r.approved);
  const approved = list.filter((r) => r.approved);

  return (
    <div className="admin-noir min-h-screen">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <div className="admin-brand-mark" />
            <div>
              <p className="admin-brand-eyebrow">Orchestrator</p>
              <p className="admin-brand-name">Control</p>
            </div>
          </div>
          <nav className="admin-nav">
            <button
              className={`admin-nav-item ${tab === "queue" ? "is-active" : ""}`}
              onClick={() => setTab("queue")}
            >
              <span>Queue</span>
              <span className="admin-count">{queue.length}</span>
            </button>
            <button
              className={`admin-nav-item ${tab === "participants" ? "is-active" : ""}`}
              onClick={() => setTab("participants")}
            >
              <span>Participants</span>
              <span className="admin-count">{approved.length}</span>
            </button>
          </nav>
          <div className="admin-sidebar-foot">
            <span className="admin-pulse" />
            Live channel
          </div>
        </aside>

        <main className="admin-main">
          <header className="admin-header">
            <div>
              <p className="admin-eyebrow">Management Dashboard</p>
              <h1 className="admin-title">{tab === "queue" ? "Approval Queue" : "Active Participants"}</h1>
            </div>
            <div className="admin-header-meta">
              <span className="admin-count-pill">{list.length} live</span>
            </div>
          </header>

          <div key={tab} className="admin-pane">
            {tab === "queue" ? (
              <QueuePane items={queue} onApprove={approve} />
            ) : (
              <ParticipantsPane
                items={approved}
                onNavigate={sendNavigate}
                onRevoke={revoke}
                events={events}
              />
            )}
          </div>
        </main>
      </div>
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
    <article className={`admin-card ${p.state === "left" ? "is-left" : ""}`}>
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
        <button
          className="admin-btn admin-btn-primary"
          onClick={() => setOpen((v) => !v)}
        >
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
  events,
}: {
  items: LiveRecord[];
  onNavigate: (id: string, suite: Suite, page: Page) => void;
  onRevoke: (id: string) => void;
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
              <ParticipantCard key={p.id} p={p} onNavigate={onNavigate} onRevoke={onRevoke} />
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
}: {
  p: LiveRecord;
  onNavigate: (id: string, suite: Suite, page: Page) => void;
  onRevoke: (id: string) => void;
}) {
  const [suite, setSuite] = useState<Suite>("red");
  const [page, setPage] = useState<Page>("home");

  const quick: Array<[Suite, Page, string]> = [
    ["red", "home", "Red · Home"],
    ["red", "contact", "Red · Contact"],
    ["blue", "home", "Blue · Home"],
    ["blue", "contact", "Blue · Contact"],
  ];

  return (
    <article className={`admin-card ${p.state === "left" ? "is-left" : ""}`}>
      <div className="admin-card-head">
        <div className="admin-card-id">
          <StatusDot state={p.state} />
          <span className="font-mono text-sm">{p.id}</span>
        </div>
        <span className="admin-tag admin-tag-live">{p.state === "on" ? "On site" : p.state === "off" ? "Focus Room" : "Left"}</span>
      </div>
      <p className="admin-card-page">on · {pageLabelFromUrl(p.currentUrl)}</p>

      <div className="admin-quick">
        {quick.map(([s, pg, label]) => (
          <button
            key={label}
            className="admin-chip"
            onClick={() => onNavigate(p.id, s, pg)}
          >
            {label}
          </button>
        ))}
      </div>

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
        <button
          className="admin-btn admin-btn-primary"
          onClick={() => onNavigate(p.id, suite, page)}
        >
          Send
        </button>
      </div>

      <div className="admin-card-actions">
        <button className="admin-btn admin-btn-ghost" onClick={() => onRevoke(p.id)}>
          Revoke access
        </button>
      </div>
    </article>
  );
}
