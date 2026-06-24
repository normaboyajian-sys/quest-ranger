import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { joinChannel, type ParticipantPresence } from "@/lib/orchestrator";
import {
  buildSrcDocCached,
  subscribeDesignChanges,
  type DesignKey,
  type PageKey,
} from "@/lib/designStore";
import { loadParticipant, subscribeParticipant } from "@/lib/participantStore";

export const Route = createFileRoute("/observe/$pid")({
  head: () => ({ meta: [{ title: "Live Preview" }] }),
  component: Observe,
});

type Cursor = { x: number; y: number };
type Ripple = { id: number; x: number; y: number };

function parseView(url: string): { theme: DesignKey; page: PageKey } | null {
  const m = url.match(/^\/view\/([a-z][a-z0-9_-]{0,30})\/([a-z][a-z0-9_-]{0,40})/);
  if (!m) return null;
  return { theme: m[1] as DesignKey, page: m[2] as PageKey };
}

function Observe() {
  const { pid } = Route.useParams();
  const [url, setUrl] = useState<string>("/");
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [version, setVersion] = useState(0);
  const [viewport, setViewport] = useState<{ w: number; h: number }>({
    w: 1280,
    h: 800,
  });
  const [scale, setScale] = useState(1);
  const inputsRef = useRef<Map<string, string>>(new Map());
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const rippleSeq = useRef(0);

  // Compute scale so the participant's full viewport fits inside our window.
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

  // Replay any input values into the iframe when it mounts/reloads.
  function replayInputsInto(el: HTMLIFrameElement | null) {
    if (!el) return;
    const win = el.contentWindow;
    if (!win) return;
    inputsRef.current.forEach((value, field) => {
      win.postMessage({ __mirror: true, type: "input", field, value }, "*");
    });
  }

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
        // Absolute coords inside participant's viewport.
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
      onInput: (p) => {
        if (p.participantId !== pid) return;
        inputsRef.current.set(p.field, p.value);
        const win = iframeRef.current?.contentWindow;
        if (win) {
          win.postMessage(
            { __mirror: true, type: "input", field: p.field, value: p.value },
            "*",
          );
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

  const view = parseView(url);

  useEffect(() => {
    if (!view) return;
    setVersion((v) => v + 1);
    const ch = subscribeDesignChanges(
      (d, p) => d === view.theme && (p === view.page || p === "shared"),
      () => setVersion((v) => v + 1),
    );
    return () => {
      void ch.unsubscribe();
    };
  }, [view?.theme, view?.page]);

  return (
    <div className="mirror-root" ref={stageWrapRef}>
      {view ? (
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
            key={`${view.theme}-${view.page}-${version}`}
            title="Observed design"
            srcDoc={buildSrcDocCached(view.theme, view.page)}
            onLoad={(e) => replayInputsInto(e.currentTarget)}
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
              className="mirror-cursor"
              style={{ left: cursor.x, top: cursor.y }}
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
              style={{ left: r.x, top: r.y }}
            />
          ))}
        </div>
      ) : (
        <div className="mirror-empty">
          <p>Participant is in the Focus Room.</p>
          <p className="mirror-empty-sub">{url}</p>
        </div>
      )}
    </div>
  );
}
