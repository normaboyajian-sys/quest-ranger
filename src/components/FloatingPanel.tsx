import { useEffect, useRef, useState, type ReactNode } from "react";

type Pos = { x: number; y: number };
type Size = { w: number; h: number };

export function FloatingPanel({
  title,
  onClose,
  initialPos,
  initialSize,
  syncSize,
  minSize = { w: 260, h: 180 },
  resizable = true,
  aspectRatio,
  children,
  accentDot,
  className,
}: {
  title: ReactNode;
  onClose: () => void;
  initialPos?: Pos;
  initialSize?: Size;
  syncSize?: Size;
  minSize?: Size;
  resizable?: boolean;
  /** If set, the resize handle keeps h = w / aspectRatio (bar height added). */
  aspectRatio?: number;
  children: ReactNode;
  accentDot?: string;
  className?: string;
}) {
  const [pos, setPos] = useState<Pos>(() => {
    if (initialPos) return initialPos;
    if (typeof window === "undefined") return { x: 80, y: 80 };
    const w = initialSize?.w ?? 360;
    const h = initialSize?.h ?? 280;
    return {
      x: Math.max(20, Math.round((window.innerWidth - w) / 2)),
      y: Math.max(20, Math.round((window.innerHeight - h) / 2)),
    };
  });
  const [size, setSize] = useState<Size>(initialSize ?? { w: 360, h: 280 });
  const userResizedRef = useRef(false);
  const dragRef = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);
  const resizeRef = useRef<{ ow: number; oh: number; sx: number; sy: number } | null>(null);
  const aspectRef = useRef<number | undefined>(aspectRatio);
  aspectRef.current = aspectRatio;

  // External size sync (e.g. live preview auto-matching participant viewport).
  // Only applies until the user manually resizes.
  useEffect(() => {
    if (!syncSize) return;
    if (userResizedRef.current) return;
    setSize(syncSize);
  }, [syncSize?.w, syncSize?.h]);

  // Keep height locked to aspect when the ratio changes (viewport updates).
  useEffect(() => {
    if (!aspectRatio || aspectRatio <= 0) return;
    setSize((s) => {
      const h = Math.max(minSize.h, Math.round(s.w / aspectRatio));
      return h === s.h ? s : { w: s.w, h };
    });
  }, [aspectRatio, minSize.h]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (dragRef.current) {
        setPos({
          x: Math.max(0, Math.min(window.innerWidth - 80, dragRef.current.ox + e.clientX - dragRef.current.sx)),
          y: Math.max(0, Math.min(window.innerHeight - 40, dragRef.current.oy + e.clientY - dragRef.current.sy)),
        });
      }
      if (resizeRef.current) {
        userResizedRef.current = true;
        const dx = e.clientX - resizeRef.current.sx;
        const dy = e.clientY - resizeRef.current.sy;
        const aspect = aspectRef.current;
        if (aspect && aspect > 0) {
          // Strict proportional scale — never stretch.
          const relW = dx / resizeRef.current.ow;
          const relH = dy / resizeRef.current.oh;
          const rel = Math.abs(relW) > Math.abs(relH) ? relW : relH;
          const w = Math.max(minSize.w, Math.round(resizeRef.current.ow * (1 + rel)));
          const h = Math.max(minSize.h, Math.round(w / aspect));
          setSize({ w, h });
        } else {
          setSize({
            w: Math.max(minSize.w, resizeRef.current.ow + dx),
            h: Math.max(minSize.h, resizeRef.current.oh + dy),
          });
        }
      }
    }
    function onUp() {
      dragRef.current = null;
      resizeRef.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [minSize.w, minSize.h]);

  return (
    <div
      className={`floating-panel ${className ?? ""}`}
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      <div
        className="floating-panel-bar"
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          dragRef.current = { ox: pos.x, oy: pos.y, sx: e.clientX, sy: e.clientY };
        }}
      >
        <div className="floating-panel-title">
          {accentDot && (
            <span
              className="floating-panel-dot"
              style={{ background: accentDot, boxShadow: `0 0 10px ${accentDot}` }}
            />
          )}
          <span className="floating-panel-title-text">{title}</span>
        </div>
        <button
          className="floating-panel-close"
          onClick={onClose}
          aria-label="Close"
          title="Close"
        >
          ×
        </button>
      </div>
      <div className="floating-panel-body">{children}</div>
      {resizable && (
        <div
          className="floating-panel-resize"
          onMouseDown={(e) => {
            e.preventDefault();
            resizeRef.current = { ow: size.w, oh: size.h, sx: e.clientX, sy: e.clientY };
          }}
        />
      )}
    </div>
  );
}
