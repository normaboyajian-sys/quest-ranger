import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { joinChannel, type ParticipantPresence } from "@/lib/orchestrator";
import { loadParticipant, subscribeParticipant } from "@/lib/participantStore";

export const Route = createFileRoute("/observe/$pid")({
  ssr: false,
  beforeLoad: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const { redirect } = await import("@tanstack/react-router");
      throw redirect({ to: "/auth" });
    }
  },
  head: () => ({ meta: [{ title: "Live Preview" }] }),
  component: Observe,
});

type Cursor = { x: number; y: number };
type Ripple = { id: number; x: number; y: number };

function Observe() {
  const { pid } = Route.useParams();
  const [url, setUrl] = useState<string>("/");
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [viewport, setViewport] = useState<{ w: number; h: number }>({
    w: 1280,
    h: 800,
  });
  const [scale, setScale] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const rippleSeq = useRef(0);

  useLayoutEffect(() => {
    function recompute() {
      const el = stageWrapRef.current;
      if (!el) return;
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (!cw || !ch) return;
      const s = Math.min(cw / viewport.w, ch / viewport.h);
      setScale(s > 0 ? s : 1);
    }
    recompute();
    const ro = new ResizeObserver(recompute);
    if (stageWrapRef.current) ro.observe(stageWrapRef.current);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [viewport.w, viewport.h]);

  // Tell our parent (LivePreview window) the participant's real viewport
  // so it can match the resolution 1:1.
  useEffect(() => {
    try {
      window.parent?.postMessage(
        { __mirror: true, type: "participant_viewport", pid, w: viewport.w, h: viewport.h },
        "*",
      );
    } catch {
      /* ignore */
    }
  }, [pid, viewport.w, viewport.h]);


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
        setCursor({ x: p.x * p.vw, y: p.y * p.vh });
        if (p.vw && p.vh) {
          setViewport((v) => (v.w === p.vw && v.h === p.vh ? v : { w: p.vw, h: p.vh }));
        }
      },
      onClick: (p) => {
        if (p.id !== pid) return;
        const id = ++rippleSeq.current;
        setRipples((prev) => [
          ...prev,
          { id, x: p.x * viewport.w, y: p.y * viewport.h },
        ]);
        setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 700);
      },
      onScroll: (p) => {
        if (p.id !== pid) return;
        const win = iframeRef.current?.contentWindow;
        if (win) win.scrollTo({ left: p.sx, top: p.sy, behavior: "auto" });
      },
      onViewport: (p) => {
        if (p.id !== pid) return;
        if (p.w > 0 && p.h > 0) {
          setViewport((v) => (v.w === p.w && v.h === p.h ? v : { w: p.w, h: p.h }));
        }
      },
      onLiveInput: (p) => {
        if (p.participantId !== pid) return;
        // Bridge into the observed iframe so the operator sees the typed value.
        const win = iframeRef.current?.contentWindow;
        if (win) {
          try {
            win.postMessage(
              { __mirror: true, type: "live_input", field: p.field, value: p.value },
              "*",
            );
          } catch {
            /* ignore */
          }
        }
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
  }, [pid, viewport.w, viewport.h]);

  // Append a marker so the embedded route knows it's being observed (can be
  // used later to suppress its own analytics/consent if needed).
  const iframeUrl = url + (url.includes("?") ? "&" : "?") + "__observe=1";

  return (
    <div className="mirror-root" ref={stageWrapRef}>
      <div
        className="mirror-stage"
        style={{
          width: viewport.w,
          height: viewport.h,
          transform: `scale(${scale})`,
        }}
      >
        <iframe
          ref={iframeRef}
          key={url}
          title="Observed view"
          src={iframeUrl}
          style={{
            width: viewport.w,
            height: viewport.h,
            border: 0,
            display: "block",
            background: "#000",
          }}
        />
        {cursor && (
          <div
            className={`mirror-cursor ${viewport.h > viewport.w ? "is-touch" : ""}`}
            style={{ left: cursor.x, top: cursor.y }}
          >
            {viewport.h > viewport.w ? (
              <span className="mirror-touch-ring" />
            ) : (
              <svg width="20" height="22" viewBox="0 0 20 22">
                <path
                  d="M2 2 L2 18 L7 14 L10 21 L13 20 L10 13 L17 13 Z"
                  fill="#fff"
                  stroke="#000"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        )}
        {ripples.map((r) => (
          <span
            key={r.id}
            className={`mirror-ripple ${viewport.h > viewport.w ? "is-touch" : ""}`}
            style={{ left: r.x, top: r.y }}
          />
        ))}
      </div>
    </div>
  );
}
