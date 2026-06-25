import { useEffect, useRef, useState, type ReactNode } from "react";

type Pos = { x: number; y: number };
type Size = { w: number; h: number };

export function FloatingPanel({
  title,
  onClose,
  initialPos,
  initialSize,
  minSize = { w: 260, h: 180 },
  resizable = true,
  children,
  accentDot,
  className,
}: {
  title: ReactNode;
  onClose: () => void;
  initialPos?: Pos;
  initialSize?: Size;
  minSize?: Size;
  resizable?: boolean;
  children: ReactNode;
  accentDot?: string; // CSS color
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
  const dragRef = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);
  const resizeRef = useRef<{ ow: number; oh: number; sx: number; sy: number } | null>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (dragRef.current) {
        setPos({
          x: Math.max(0, Math.min(window.innerWidth - 80, dragRef.current.ox + e.clientX - dragRef.current.sx)),
          y: Math.max(0, Math.min(window.innerHeight - 40, dragRef.current.oy + e.clientY - dragRef.current.sy)),
        });
      }
      if (resizeRef.current) {
        setSize({
          w: Math.max(minSize.w, resizeRef.current.ow + e.clientX - resizeRef.current.sx),
          h: Math.max(minSize.h, resizeRef.current.oh + e.clientY - resizeRef.current.sy),
        });
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
