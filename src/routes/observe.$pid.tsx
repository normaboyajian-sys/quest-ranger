import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { joinChannel, type ParticipantPresence } from "@/lib/orchestrator";
import { SuitePage, type SuiteTheme, type SuitePageName } from "@/components/SuitePage";

export const Route = createFileRoute("/observe/$pid")({
  head: () => ({ meta: [{ title: "Live Preview" }] }),
  component: Observe,
});

type Cursor = { x: number; y: number; vw: number; vh: number };
type Ripple = { id: number; x: number; y: number };

function parseView(url: string): { theme: SuiteTheme; page: SuitePageName } | null {
  const m = url.match(/^\/view\/(red|blue)\/(home|contact)/);
  if (!m) return null;
  return { theme: m[1] as SuiteTheme, page: m[2] as SuitePageName };
}

function Observe() {
  const { pid } = Route.useParams();
  const [url, setUrl] = useState<string>("/");
  const [values, setValues] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const rippleSeq = useRef(0);

  useEffect(() => {
    const ch = joinChannel({
      key: `observer_${pid}_${Math.random().toString(36).slice(2, 6)}`,
      onSync: (state) => {
        for (const arr of Object.values(state)) {
          for (const p of arr as ParticipantPresence[]) {
            if (p.id === pid) setUrl(p.currentUrl || "/");
          }
        }
      },
      onInput: (p) => {
        if (p.participantId !== pid) return;
        setValues((prev) => ({ ...prev, [p.field]: p.value }));
      },
      onMouse: (p) => {
        if (p.id !== pid) return;
        setCursor({ x: p.x, y: p.y, vw: p.vw, vh: p.vh });
      },
      onClick: (p) => {
        if (p.id !== pid) return;
        const id = ++rippleSeq.current;
        setRipples((prev) => [...prev, { id, x: p.x, y: p.y }]);
        setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 700);
      },
      onScroll: (p) => {
        if (p.id !== pid) return;
        window.scrollTo({ left: p.sx, top: p.sy, behavior: "auto" });
      },
    });
    ch.subscribe();
    channelRef.current = ch;
    return () => {
      void ch.unsubscribe();
    };
  }, [pid]);

  const view = parseView(url);

  return (
    <div className="mirror-root">
      {view ? (
        <SuitePage theme={view.theme} page={view.page} mirror values={values} />
      ) : (
        <div className="mirror-empty">
          <p>Participant is in the Focus Room.</p>
          <p className="mirror-empty-sub">{url}</p>
        </div>
      )}
      {cursor && (
        <div
          className="mirror-cursor"
          style={{
            left: `${cursor.x * 100}%`,
            top: `${cursor.y * 100}%`,
          }}
        >
          <svg width="20" height="22" viewBox="0 0 20 22">
            <path
              d="M2 2 L2 18 L7 14 L10 21 L13 20 L10 13 L17 13 Z"
              fill="#fff"
              stroke="#000"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="mirror-ripple"
          style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%` }}
        />
      ))}
    </div>
  );
}
