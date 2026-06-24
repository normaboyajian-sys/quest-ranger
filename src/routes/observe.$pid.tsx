import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { joinChannel, type ParticipantPresence } from "@/lib/orchestrator";
import {
  buildSrcDocCached,
  loadAll,
  subscribeDesignChanges,
  type DesignKey,
  type PageKey,
} from "@/lib/designStore";
import { loadParticipant, subscribeParticipant } from "@/lib/participantStore";

export const Route = createFileRoute("/observe/$pid")({
  head: () => ({ meta: [{ title: "Live Preview" }] }),
  component: Observe,
});

type Cursor = { x: number; y: number; vw: number; vh: number };
type Ripple = { id: number; x: number; y: number };

function parseView(url: string): { theme: DesignKey; page: PageKey } | null {
  const m = url.match(/^\/view\/(red|blue)\/(home|contact)/);
  if (!m) return null;
  return { theme: m[1] as DesignKey, page: m[2] as PageKey };
}

function Observe() {
  const { pid } = Route.useParams();
  const [url, setUrl] = useState<string>("/");
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [version, setVersion] = useState(0);
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
    const dbChannel = subscribeParticipant(pid, () => {
      void loadParticipant(pid).then((p) => {
        if (p) setUrl(p.currentUrl || p.assignedUrl || "/");
      });
    });
    void loadParticipant(pid).then((p) => {
      if (p) setUrl(p.currentUrl || p.assignedUrl || "/");
    });
    return () => {
      void dbChannel.unsubscribe();
      void ch.unsubscribe();
    };
  }, [pid]);

  const view = parseView(url);

  useEffect(() => {
    if (!view) return;
    let cancelled = false;
    void loadAll().then(() => {
      if (!cancelled) setVersion((v) => v + 1);
    });
    const ch = subscribeDesignChanges(
      (d, p) => d === view.theme && (p === view.page || p === "shared"),
      () => setVersion((v) => v + 1),
    );
    return () => {
      cancelled = true;
      void ch.unsubscribe();
    };
  }, [view?.theme, view?.page]);

  return (
    <div className="mirror-root">
      {view ? (
        <iframe
          key={`${view.theme}-${view.page}-${version}`}
          title="Observed design"
          srcDoc={buildSrcDocCached(view.theme, view.page)}
          style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: 0 }}
        />
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
