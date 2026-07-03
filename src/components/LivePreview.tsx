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

const TITLEBAR = 36;

function fitToParticipant(w: number, h: number, maxLong: number): Size {
  if (!w || !h) return { w: 360, h: 240 };
  const long = Math.max(w, h);
  const scale = Math.min(1, maxLong / long);
  return { w: Math.round(w * scale), h: Math.round(h * scale) + TITLEBAR };
}

export function LivePreview({
  pid,
  onClose,
  initial,
  initialUrl,
  initialViewport,
}: {
  pid: string;
  onClose: () => void;
  initial: { pos: Pos; size: Size };
  initialUrl?: string | null;
  initialViewport?: { w: number; h: number } | null;
}) {
  const [url, setUrl] = useState<string>(initialUrl || "/");
  const [viewport, setViewport] = useState<{ w: number; h: number }>(
    initialViewport && initialViewport.w > 0 && initialViewport.h > 0
      ? initialViewport
      : { w: 390, h: 844 },
  );
  const [scale, setScale] = useState(1);
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [keys, setKeys] = useState<KeyChip[]>([]);
  const [hasViewport, setHasViewport] = useState<boolean>(
    !!(initialViewport && initialViewport.w > 0 && initialViewport.h > 0),
  );
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
      const next = p.currentUrl || p.assignedUrl || "/";
      setUrl((prev) => (prev === next ? prev : next));
    });
    const dbCh = subscribeParticipant(pid, () => {
      void loadParticipant(pid).then((p) => {
        if (!alive || !p) return;
        const next = p.currentUrl || p.assignedUrl || "/";
        setUrl((prev) => (prev === next ? prev : next));
      });
    });
    return () => {
      alive = false;
      void dbCh.unsubscribe();
    };
  }, [pid]);

  // Listen on the admin-page event bus (no second realtime channel — would
  // collide with the admin's subscription).
  useEffect(() => {
    const cursorRef = { x: 0, y: 0, has: false };

    function onMouse(ev: Event) {
      const p = (ev as CustomEvent<MousePayload>).detail;
      if (p.id !== pid) return;
      if (p.vw && p.vh) {
        setViewport((v) => (v.w === p.vw && v.h === p.vh ? v : { w: p.vw, h: p.vh }));
        setHasViewport(true);
      }
      const x = p.x * p.vw;
      const y = p.y * p.vh;
      cursorRef.x = x;
      cursorRef.y = y;
      cursorRef.has = true;
      setCursor({ x, y });
    }

    function onClickEv(ev: Event) {
      const p = (ev as CustomEvent<ClickPayload>).detail;
      if (p.id !== pid) return;
      const id = ++rippleSeq.current;
      setRipples((prev) => [
        ...prev,
        { id, x: p.x * viewport.w, y: p.y * viewport.h },
      ]);
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 700);
    }

    function onScrollEv(ev: Event) {
      const p = (ev as CustomEvent<ScrollPayload>).detail;
      if (p.id !== pid) return;
      const win = iframeRef.current?.contentWindow;
      if (win) win.scrollTo({ left: p.sx, top: p.sy, behavior: "auto" });
    }

    function onViewportEv(ev: Event) {
      const p = (ev as CustomEvent<ViewportPayload>).detail;
      if (p.id !== pid || !p.w || !p.h) return;
      setViewport((v) => (v.w === p.w && v.h === p.h ? v : { w: p.w, h: p.h }));
      setHasViewport(true);
    }

    function onLiveInputEv(ev: Event) {
      const p = (ev as CustomEvent<LiveInputPayload>).detail;
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
      const prev = lastValueRef.current[p.field] ?? "";
      lastValueRef.current[p.field] = p.value;
      const cx = cursorRef.has ? cursorRef.x : viewport.w / 2;
      const cy = cursorRef.has ? cursorRef.y : viewport.h / 2;
      if (p.value.length > prev.length && p.value.startsWith(prev)) {
        const added = p.value.slice(prev.length);
        const ch = added.slice(-1);
        if (ch) {
          const id = ++keySeq.current;
          const display = p.ftype === "password" ? "•" : ch;
          setKeys((k) => [...k, { id, x: cx, y: cy, ch: display }]);
          setTimeout(() => setKeys((k) => k.filter((x) => x.id !== id)), 900);
        }
      } else if (p.value.length < prev.length) {
        const id = ++keySeq.current;
        setKeys((k) => [...k, { id, x: cx, y: cy, ch: "⌫" }]);
        setTimeout(() => setKeys((k) => k.filter((x) => x.id !== id)), 900);
      }
    }

    window.addEventListener("ux:mouse", onMouse);
    window.addEventListener("ux:click", onClickEv);
    window.addEventListener("ux:scroll", onScrollEv);
    window.addEventListener("ux:viewport", onViewportEv);
    window.addEventListener("ux:liveinput", onLiveInputEv);
    return () => {
      window.removeEventListener("ux:mouse", onMouse);
      window.removeEventListener("ux:click", onClickEv);
      window.removeEventListener("ux:scroll", onScrollEv);
      window.removeEventListener("ux:viewport", onViewportEv);
      window.removeEventListener("ux:liveinput", onLiveInputEv);
    };
  }, [pid, viewport.w, viewport.h]);

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

  // Cap the auto-fit to the viewer's own window so the panel isn't larger
  // than the admin screen, but otherwise render at the participant's real size.
  const maxLong =
    typeof window !== "undefined"
      ? Math.max(320, Math.min(window.innerWidth, window.innerHeight) - 80)
      : 720;
  const fittedSize = hasViewport
    ? fitToParticipant(viewport.w, viewport.h, maxLong)
    : initialSize.current;
  const isPhone = viewport.w > 0 && viewport.h > viewport.w;
  const resLabel = hasViewport ? `${viewport.w}×${viewport.h}` : "…";
  const aspect = viewport.w && viewport.h
    ? viewport.w / (viewport.h + TITLEBAR)
    : undefined;

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
      aspectRatio={aspect}
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
