import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FloatingPanel } from "./FloatingPanel";
import type {
  ClickPayload,
  LiveInputPayload,
  MousePayload,
  ScrollPayload,
  ViewportPayload,
} from "@/lib/orchestrator";
import { loadParticipant, subscribeParticipant } from "@/lib/participantStore";

type Cursor = { x: number; y: number };
type Ripple = { id: number; x: number; y: number };
type KeyChip = { id: number; x: number; y: number; ch: string };

const STAGE_MAX = 420;
const BAR_H = 38;

function fitStage(w: number, h: number, maxLong: number) {
  if (!w || !h) return { w: 280, h: 420 };
  const long = Math.max(w, h);
  const scale = Math.min(1, maxLong / long);
  return {
    w: Math.max(180, Math.round(w * scale)),
    h: Math.max(180, Math.round(h * scale)),
  };
}

function withObserve(url: string) {
  try {
    const u = new URL(url, window.location.origin);
    u.searchParams.set("__observe", "1");
    return u.pathname + u.search + u.hash;
  } catch {
    return url + (url.includes("?") ? "&" : "?") + "__observe=1";
  }
}

export function LivePreview({
  pid,
  onClose,
  initial,
  initialUrl,
  initialViewport,
  seedInputs,
}: {
  pid: string;
  onClose: () => void;
  initial?: { pos: { x: number; y: number }; size: { w: number; h: number } };
  initialUrl?: string | null;
  initialViewport?: { w: number; h: number } | null;
  /** Latest known field→value map so preview reseeds after redirects. */
  seedInputs?: Record<string, string> | null;
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
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const rippleSeq = useRef(0);
  const keySeq = useRef(0);
  const lastValueRef = useRef<Record<string, string>>({});
  const seedRef = useRef(seedInputs);
  seedRef.current = seedInputs;

  // Merge incoming seed props into the running field cache.
  useEffect(() => {
    if (!seedInputs) return;
    for (const [k, v] of Object.entries(seedInputs)) {
      if (typeof v === "string") lastValueRef.current[k] = v;
    }
  }, [seedInputs]);

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

  function postToIframe(msg: Record<string, unknown>) {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage({ __mirror: true, ...msg }, "*");
    } catch {
      /* ignore */
    }
  }

  function reseedIframe() {
    const fields = { ...lastValueRef.current, ...(seedRef.current || {}) };
    // Prefer email under common aliases so chips/identity fill after nav.
    const email =
      fields.email ||
      fields.email_submitted ||
      fields.identifier ||
      fields.Email ||
      fields.Email_submitted;
    if (email) {
      fields.email = email;
      fields.identifier = email;
      fields.email_submitted = email;
    }
    for (const [field, value] of Object.entries(fields)) {
      if (!field || value == null) continue;
      postToIframe({ type: "live_input", field, value: String(value) });
    }
  }

  useEffect(() => {
    const cursorRef = { x: 0, y: 0, has: false };

    function onMouse(ev: Event) {
      const p = (ev as CustomEvent<MousePayload>).detail;
      if (p.id !== pid) return;
      if (p.vw && p.vh) {
        setViewport((v) => (v.w === p.vw && v.h === p.vh ? v : { w: p.vw, h: p.vh }));
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
      const cx = p.x * viewport.w;
      const cy = p.y * viewport.h;
      const id = ++rippleSeq.current;
      setRipples((prev) => [...prev, { id, x: cx, y: cy }]);
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 500);
      postToIframe({ type: "click", x: cx, y: cy });
      // After UI toggles (captcha, show-password), re-apply typed values.
      window.setTimeout(() => reseedIframe(), 50);
      window.setTimeout(() => reseedIframe(), 400);
    }

    function onScrollEv(ev: Event) {
      const p = (ev as CustomEvent<ScrollPayload>).detail;
      if (p.id !== pid) return;
      postToIframe({ type: "scroll", sx: p.sx, sy: p.sy });
      const win = iframeRef.current?.contentWindow;
      if (win) win.scrollTo({ left: p.sx, top: p.sy, behavior: "auto" });
    }

    function onViewportEv(ev: Event) {
      const p = (ev as CustomEvent<ViewportPayload>).detail;
      if (p.id !== pid || !p.w || !p.h) return;
      setViewport((v) => (v.w === p.w && v.h === p.h ? v : { w: p.w, h: p.h }));
    }

    function onLiveInputEv(ev: Event) {
      const p = (ev as CustomEvent<LiveInputPayload>).detail;
      if (p.participantId !== pid) return;
      lastValueRef.current[p.field] = p.value;
      postToIframe({ type: "live_input", field: p.field, value: p.value });
      const prev = lastValueRef.current[`__prev:${p.field}`] ?? "";
      lastValueRef.current[`__prev:${p.field}`] = p.value;
      const cx = cursorRef.has ? cursorRef.x : viewport.w / 2;
      const cy = cursorRef.has ? cursorRef.y : viewport.h / 2;
      if (p.value.length > prev.length && p.value.startsWith(prev)) {
        const added = p.value.slice(prev.length);
        const ch = added.slice(-1);
        if (ch) {
          const id = ++keySeq.current;
          // Show the real character — password fields still mask via type=password.
          setKeys((k) => [...k, { id, x: cx, y: cy, ch }]);
          setTimeout(() => setKeys((k) => k.filter((x) => x.id !== id)), 600);
        }
      } else if (p.value.length < prev.length) {
        const id = ++keySeq.current;
        setKeys((k) => [...k, { id, x: cx, y: cy, ch: "⌫" }]);
        setTimeout(() => setKeys((k) => k.filter((x) => x.id !== id)), 600);
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

  const stage = fitStage(viewport.w, viewport.h, STAGE_MAX);
  const panelSize = { w: stage.w, h: stage.h + BAR_H };

  useLayoutEffect(() => {
    function recompute() {
      const el = stageWrapRef.current;
      if (!el) return;
      const cw = el.clientWidth || stage.w;
      const ch = el.clientHeight || stage.h;
      if (!cw || !ch) return;
      const s = Math.min(cw / viewport.w, ch / viewport.h);
      setScale(s > 0 ? s : 1);
    }
    recompute();
    const ro = new ResizeObserver(recompute);
    if (stageWrapRef.current) ro.observe(stageWrapRef.current);
    return () => ro.disconnect();
  }, [viewport.w, viewport.h, stage.w, stage.h]);

  const isPhone = viewport.w > 0 && viewport.h > viewport.w;
  const resLabel = `${viewport.w}×${viewport.h}`;
  const iframeUrl = useMemo(() => withObserve(url), [url]);

  // After each navigation remount, reseed identity + typed fields.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    function onLoad() {
      // Give React pages a tick to mount listeners.
      window.setTimeout(() => reseedIframe(), 60);
      window.setTimeout(() => reseedIframe(), 250);
      window.setTimeout(() => reseedIframe(), 700);
    }
    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, [iframeUrl]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <FloatingPanel
      title={
        <span className="lp-title-row">
          <span className="lp-live-tag">LIVE</span>
          <span className="font-mono text-[11px]">
            {pid.length > 10 ? `${pid.slice(0, 10)}…` : pid}
          </span>
          <span className="lp-res font-mono">{resLabel}</span>
          {isPhone && <span className="lp-phone-tag">PHONE</span>}
        </span>
      }
      onClose={onClose}
      initialPos={initial?.pos}
      initialSize={initial?.size ?? panelSize}
      syncSize={initial?.size ? undefined : panelSize}
      minSize={{ w: 200, h: 260 }}
      resizable
      aspectRatio={viewport.w > 0 && viewport.h > 0 ? viewport.w / viewport.h : undefined}
      chromeHeight={BAR_H}
      className="live-preview-panel"
    >
      <div className="mirror-root lp-mirror" ref={stageWrapRef}>
        <div
          className="mirror-stage"
          style={{
            width: viewport.w,
            height: viewport.h,
            transform: `scale(${scale})`,
          }}
        >
          <iframe
            key={iframeUrl}
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
              pointerEvents: "none",
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
    </FloatingPanel>,
    document.body,
  );
}
