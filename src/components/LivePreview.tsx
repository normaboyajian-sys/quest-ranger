import { useEffect, useRef, useState } from "react";

type Pos = { x: number; y: number };
type Size = { w: number; h: number };

export function LivePreview({
  pid,
  onClose,
  initial,
}: {
  pid: string;
  onClose: () => void;
  initial: { pos: Pos; size: Size };
}) {
  const [pos, setPos] = useState<Pos>(initial.pos);
  const [size, setSize] = useState<Size>(initial.size);
  const [minimized, setMinimized] = useState(false);
  const dragRef = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);
  const resizeRef = useRef<{ ow: number; oh: number; sx: number; sy: number } | null>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (dragRef.current) {
        setPos({
          x: Math.max(0, dragRef.current.ox + e.clientX - dragRef.current.sx),
          y: Math.max(0, dragRef.current.oy + e.clientY - dragRef.current.sy),
        });
      }
      if (resizeRef.current) {
        setSize({
          w: Math.max(260, resizeRef.current.ow + e.clientX - resizeRef.current.sx),
          h: Math.max(180, resizeRef.current.oh + e.clientY - resizeRef.current.sy),
        });
      }
    }
    function onUp() {
      dragRef.current = null;
      resizeRef.current = null;
    }
    function onMsg(e: MessageEvent) {
      const d = e.data;
      if (!d || typeof d !== "object" || d.__mirror !== true) return;
      if (d.type === "participant_viewport" && d.pid === pid) {
        const w = Number(d.w);
        const h = Number(d.h);
        if (w > 0 && h > 0) {
          // Cap to 90% of admin viewport so the window still fits on screen.
          const maxW = Math.floor(window.innerWidth * 0.9);
          const maxH = Math.floor(window.innerHeight * 0.9);
          const scale = Math.min(1, maxW / w, maxH / h);
          setSize({ w: Math.round(w * scale) + 2, h: Math.round(h * scale) + 32 });
        }
      }
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("message", onMsg);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("message", onMsg);
    };
  }, [pid]);


  return (
    <div
      className="live-preview"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: minimized ? 40 : size.h,
      }}
    >
      <div
        className="live-preview-bar"
        onMouseDown={(e) => {
          dragRef.current = { ox: pos.x, oy: pos.y, sx: e.clientX, sy: e.clientY };
        }}
      >
        <div className="live-preview-title">
          <span className="live-preview-dot" />
          <span className="font-mono text-[11px]">{pid}</span>
          <span className="live-preview-label">LIVE</span>
        </div>
        <div className="live-preview-actions">
          <button
            onClick={() => setSize((s) => ({ w: Math.max(260, s.w - 80), h: Math.max(180, s.h - 60) }))}
            title="Smaller"
          >
            −
          </button>
          <button
            onClick={() => setSize((s) => ({ w: s.w + 80, h: s.h + 60 }))}
            title="Bigger"
          >
            +
          </button>
          <button onClick={() => setMinimized((m) => !m)} title="Minimize">
            {minimized ? "▢" : "_"}
          </button>
          <button onClick={onClose} title="Close" className="live-preview-close">
            ×
          </button>
        </div>
      </div>
      {!minimized && (
        <>
          <iframe
            src={`/observe/${pid}`}
            title={`Live preview ${pid}`}
            className="live-preview-frame"
          />
          <div
            className="live-preview-resize"
            onMouseDown={(e) => {
              e.preventDefault();
              resizeRef.current = { ow: size.w, oh: size.h, sx: e.clientX, sy: e.clientY };
            }}
          />
        </>
      )}
    </div>
  );
}
