import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { GlobeIcon, RH_FONT_FAMILY, RhLogo, useRhTracking } from "@/components/rh/RhShared";

export const Route = createFileRoute("/rh/loading")({
  head: () => ({ meta: [{ title: "Loading…" }] }),
  component: RhLoadingPage,
});

function SpinningLoader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 100;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    ctx.scale(dpr, dpr);

    let animId: number;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 20;
    const barCount = 14;
    const gapAngle = Math.PI * 0.45;
    const arcSpan = Math.PI * 2 - gapAngle;
    const startTime = performance.now();

    const draw = (now: number) => {
      const t = (now - startTime) / 1000;
      ctx.clearRect(0, 0, size, size);
      const rotation = t * 1.8;
      for (let i = 0; i < barCount; i++) {
        const frac = i / barCount;
        const angle = rotation + frac * arcSpan;
        const opacity = 0.15 + frac * 0.85;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        const phase = i * 2.39;
        const speed = 0.8 + (i % 5) * 0.4;
        const bodyH = 4 + Math.sin(phase + t * speed) * 2.5 + Math.cos(phase * 0.7 + t * 1.3) * 1.5;
        const bodyW = 2;
        const wickH = bodyH + 2 + Math.sin(phase * 1.5 + t * 0.6) * 2;
        const isGreen = Math.sin(phase + t * 0.3) > 0;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + Math.PI / 2);
        ctx.strokeStyle = isGreen ? `rgba(0, 200, 83, ${opacity})` : `rgba(255, 23, 68, ${opacity})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -wickH / 2);
        ctx.lineTo(0, wickH / 2);
        ctx.stroke();
        ctx.fillStyle = isGreen ? `rgba(0, 200, 83, ${opacity})` : `rgba(255, 23, 68, ${opacity})`;
        ctx.fillRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH);
        ctx.restore();
      }
      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} style={{ display: "block" }} />;
}

function RhLoadingPage() {
  useRhTracking();
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", fontFamily: RH_FONT_FAMILY }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", zIndex: 20 }}>
        <RhLogo />
        <button style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", padding: "8px 12px" }}>
          <GlobeIcon />
          <span>US</span>
        </button>
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
        <SpinningLoader />
      </div>
    </div>
  );
}
