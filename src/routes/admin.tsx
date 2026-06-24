import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  joinChannel,
  type InputPayload,
  type NavigatePayload,
  type ParticipantPresence,
} from "@/lib/orchestrator";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Management Dashboard — Orchestrator" }],
  }),
  component: Admin,
});

const SUITES = ["red", "blue"] as const;
const PAGES = ["home", "contact"] as const;

function Admin() {
  const [participants, setParticipants] = useState<ParticipantPresence[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [suite, setSuite] = useState<(typeof SUITES)[number]>("red");
  const [page, setPage] = useState<(typeof PAGES)[number]>("home");
  const [events, setEvents] = useState<InputPayload[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const ch = joinChannel({
      key: `admin_${Math.random().toString(36).slice(2, 8)}`,
      onSync: (state) => {
        const list: ParticipantPresence[] = [];
        for (const arr of Object.values(state)) {
          for (const p of arr) {
            if ((p as ParticipantPresence).id) list.push(p as ParticipantPresence);
          }
        }
        list.sort((a, b) => a.joinedAt - b.joinedAt);
        setParticipants(list);
      },
      onInput: (p) => setEvents((prev) => [p, ...prev].slice(0, 200)),
    });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ admin: true });
    });
    channelRef.current = ch;
    return () => {
      void ch.unsubscribe();
    };
  }, []);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function sendNavigate(allOverride?: boolean) {
    const ch = channelRef.current;
    if (!ch) return;
    const url = `/view/${suite}/${page}`;
    const payload: NavigatePayload = {
      targets: allOverride || selected.size === 0 ? "all" : Array.from(selected),
      url,
    };
    void ch.send({ type: "broadcast", event: "navigate", payload });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Orchestrator
          </p>
          <h1 className="text-xl font-semibold tracking-tight">Management Dashboard</h1>
        </div>
        <div className="text-sm text-muted-foreground">
          <span className="font-mono text-foreground">{participants.length}</span> active
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-px bg-border">
        {/* Participants */}
        <section className="bg-background p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Participants
          </h2>
          <div className="space-y-2">
            {participants.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No participants connected.</p>
            )}
            {participants.map((p) => (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  selected.has(p.id)
                    ? "border-foreground bg-accent"
                    : "border-border hover:border-foreground/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm">{p.id}</span>
                  <span className="font-mono text-xs text-muted-foreground">{p.currentUrl}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold mb-3">Redirection Hub</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Suite</span>
                <select
                  value={suite}
                  onChange={(e) => setSuite(e.target.value as typeof suite)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {SUITES.map((s) => (
                    <option key={s} value={s}>
                      {s === "red" ? "Industrial Red" : "Modern Blue"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">View</span>
                <select
                  value={page}
                  onChange={(e) => setPage(e.target.value as typeof page)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {PAGES.map((p) => (
                    <option key={p} value={p}>
                      {p[0].toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => sendNavigate(false)}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Route {selected.size > 0 ? `${selected.size} selected` : "all"}
              </button>
              <button
                onClick={() => sendNavigate(true)}
                className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
              >
                Force all
              </button>
            </div>
          </div>
        </section>

        {/* Interaction Feed */}
        <section className="bg-background p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Interaction Feed
          </h2>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {events.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                Waiting for input events. Password fields are excluded by design.
              </p>
            )}
            {events.map((e, i) => (
              <div
                key={i}
                className="rounded-md border border-border p-3 text-sm font-mono"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{e.participantId}</span>
                  <span>{new Date(e.at).toLocaleTimeString()}</span>
                </div>
                <div className="mt-1">
                  <span className="text-muted-foreground">{e.field}:</span>{" "}
                  <span className="text-foreground">{e.value || <em className="text-muted-foreground">(empty)</em>}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{e.url}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
