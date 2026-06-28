import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FloatingPanel } from "./FloatingPanel";
import type {
  ClickPayload,
  LiveInputPayload,
  MousePayload,
  ScrollPayload,
  ViewportPayload,
} from "@/lib/orchestrator";
import { loadParticipant, subscribeParticipant } from "@/lib/participantStore";

type Pos = { x: number; y: number };
type Size = { w: number; h: number };
type Cursor = { x: number; y: number };
type Ripple = { id: number; x: number; y: number };
type KeyChip = { id: number; x: number; y: number; ch: string };

const MAX_LONG_EDGE = 340;
const TITLEBAR = 36;

function fitToParticipant(w: number, h: number): Size {
  if (!w || !h) return { w: 360, h: 240 };
  const long = Math.max(w, h);
  const scale = Math.min(1, MAX_LONG_EDGE / long);
  return { w: Math.round(w * scale), h: Math.round(h * scale) + TITLEBAR };
}

export function LivePreview({
  pid,
  onClose,
  initial,
}: {
  pid: string;
  onClose: () => void;
  initial: { pos: Pos; size: Size };
}) {
  const [url, setUrl] = useState<string>("/");
  const [viewport, setViewport] = useState<{ w: number; h: number }>({ w: 390, h: 844 });
  const [scale, setScale] = useState(1);
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [keys, setKeys] = useState<KeyChip[]>([]);
  const [hasViewport, setHasViewport] = useState(false);
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initialSize = useRef<Size>(initial.size);
  const rippleSeq = useRef(0);
  const keySeq = useRef(0);
  const lastValueRef = useRef<Record<string, string>>({});

  // Fast initial load: hydrate URL from store immediately.
  useEffect(() => {
    let alive = true;
    void loadParticipant(pid).then((p) => {
      if (!alive || !p) return;
      setUrl(p.currentUrl || p.assignedUrl || "/");
    });
    const dbCh = subscribeParticipant(pid, () => {
      void loadParticipant(pid).then((p) => {
        if (!alive || !p) return;
        setUrl(p.currentUrl || p.assignedUrl || "/");
      });
    });
    return () => {
      alive = false;
      void dbCh.unsubscribe();
    };
  }, [pid]);

  // Realtime: cursor, clicks, viewport, typing — directly in this component.
  useEffect(() => {
    const ch = joinChannel({
      key: `lp_${pid}_${Math.random().toString(36).slice(2, 6)}`,
      onSync: (state) => {
        for (const arr of Object.values(state)) {
          for (const p of arr as ParticipantPresence[]) {
            if (p.id === pid && p.currentUrl) setUrl(p.currentUrl);
          }
        }
      },
      onMouse: (p) => {
        if (p.id !== pid) return;
        if (p.vw && p.vh) {
          setViewport((v) => (v.w === p.vw && v.h === p.vh ? v : { w: p.vw, h: p.vh }));
          setHasViewport(true);
        }
        setCursor({ x: p.x * p.vw, y: p.y * p.vh });
      },
      onClick: (p) => {
        if (p.id !== pid) return;
        const id = ++rippleSeq.current;
        setRipples((prev) => [...prev, { id, x: p.x * viewport.w, y: p.y * viewport.h }]);
        setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 700);
      },
      onScroll: (p) => {
        if (p.id !== pid) return;
        const win = iframeRef.current?.contentWindow;
        if (win) win.scrollTo({ left: p.sx, top: p.sy, behavior: "auto" });
      },
      onViewport: (p) => {
        if (p.id !== pid || !p.w || !p.h) return;
        setViewport((v) => (v.w === p.w && v.h === p.h ? v : { w: p.w, h: p.h }));
        setHasViewport(true);
      },
      onLiveInput: (p) => {
        if (p.participantId !== pid) return;
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
        // Typing animation: derive newly-typed char(s) by diffing.
        const prev = lastValueRef.current[p.field] ?? "";
        lastValueRef.current[p.field] = p.value;
        if (p.value.length > prev.length && p.value.startsWith(prev)) {
          const added = p.value.slice(prev.length);
          const ch = added.slice(-1);
          if (ch) {
            const cx = cursor?.x ?? viewport.w / 2;
            const cy = cursor?.y ?? viewport.h / 2;
            const id = ++keySeq.current;
            const display = p.ftype === "password" ? "•" : ch;
            setKeys((k) => [...k, { id, x: cx, y: cy, ch: display }]);
            setTimeout(() => setKeys((k) => k.filter((x) => x.id !== id)), 900);
          }
        } else if (p.value.length < prev.length) {
          const cx = cursor?.x ?? viewport.w / 2;
          const cy = cursor?.y ?? viewport.h / 2;
          const id = ++keySeq.current;
          setKeys((k) => [...k, { id, x: cx, y: cy, ch: "⌫" }]);
          setTimeout(() => setKeys((k) => k.filter((x) => x.id !== id)), 900);
        }
      },
    });
    ch.subscribe();
    return () => {
      void ch.unsubscribe();
    };
  }, [pid, viewport.w, viewport.h, cursor]);

  // Fit stage to panel body.
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

  const fittedSize = hasViewport
    ? fitToParticipant(viewport.w, viewport.h)
    : initialSize.current;
  const isPhone = viewport.w > 0 && viewport.h > viewport.w;
  const resLabel = hasViewport ? `${viewport.w}×${viewport.h}` : "…";

  const iframeUrl = useMemo(
    () => url + (url.includes("?") ? "&" : "?") + "__observe=1",
    [url],
  );

  return (
    <FloatingPanel
      title={
        <span className="lp-title-row">
          <span className="lp-live-tag">LIVE</span>
          <span className="font-mono text-[11px]">{pid}</span>
          <span className="lp-res font-mono">{resLabel}</span>
          {isPhone && <span className="lp-phone-tag">PHONE</span>}
        </span>
      }
      onClose={onClose}
      accentDot="#5dffa3"
      initialPos={initial.pos}
      initialSize={fittedSize}
      syncSize={fittedSize}
      minSize={{ w: 160, h: 140 }}
      className="live-preview-panel"
    >
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
            title={`Live ${pid}`}
            src={iframeUrl}
            loading="eager"
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
              className={`mirror-cursor ${isPhone ? "is-touch" : ""}`}
              style={{ left: cursor.x, top: cursor.y }}
            >
              {isPhone ? (
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
              className={`mirror-ripple ${isPhone ? "is-touch" : ""}`}
              style={{ left: r.x, top: r.y }}
            />
          ))}
          {keys.map((k) => (
            <span key={k.id} className="mirror-keychip" style={{ left: k.x, top: k.y }}>
              {k.ch}
            </span>
          ))}
        </div>
      </div>
    </FloatingPanel>
  );
}
