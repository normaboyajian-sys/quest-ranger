import { useEffect, useRef, useState } from "react";
import { FloatingPanel } from "./FloatingPanel";

type Pos = { x: number; y: number };
type Size = { w: number; h: number };

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
  const [viewport, setViewport] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const initialSize = useRef<Size>(initial.size);
  const [autoFit, setAutoFit] = useState(true);
  const [overrideSize, setOverrideSize] = useState<Size | null>(null);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data;
      if (!d || typeof d !== "object" || d.__mirror !== true) return;
      if (d.type === "participant_viewport" && d.pid === pid) {
        const w = Number(d.w);
        const h = Number(d.h);
        if (w > 0 && h > 0) setViewport({ w, h });
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [pid]);

  const fittedSize = viewport.w > 0
    ? fitToParticipant(viewport.w, viewport.h)
    : initialSize.current;
  const size = autoFit ? fittedSize : (overrideSize ?? fittedSize);

  const isPhone = viewport.w > 0 && viewport.h > viewport.w;
  const resLabel = viewport.w > 0 ? `${viewport.w}×${viewport.h}` : "—";

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
      initialSize={size}
      minSize={{ w: 160, h: 140 }}
      className="live-preview-panel"
    >
      <div
        className="live-preview-inner"
        style={{ width: "100%", height: "100%" }}
        onDoubleClick={() => {
          setAutoFit((v) => !v);
          if (autoFit) setOverrideSize(size);
        }}
      >
        <iframe
          src={`/observe/${pid}`}
          title={`Live preview ${pid}`}
          className="live-preview-frame"
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </FloatingPanel>
  );
}
