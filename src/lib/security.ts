import { getRequest } from "@tanstack/react-start/server";

/** Canonical host for the control panel (dashboard + auth). */
export const DEFAULT_PANEL_HOST = "ilovemolly.com";

const PANEL_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline' https:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://ipwho.is",
  "frame-src 'self' blob:",
  "worker-src 'self' blob:",
].join("; ");

/**
 * Participant / tester domains — allow Google Sites (+ other hosts) to iframe
 * so an Embed code on sites.google.com can load the session and still register
 * participants for admin redirect.
 */
const EMBEDDABLE_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // Google Sites + generic https parents; panel host stays locked separately.
  "frame-ancestors 'self' https://sites.google.com https://*.googleusercontent.com https://*.google.com https:",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline' https:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://ipwho.is",
  "frame-src 'self' blob:",
  "worker-src 'self' blob:",
].join("; ");

/** Security headers for the control panel (never embeddable). */
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-DNS-Prefetch-Control": "off",
  "Content-Security-Policy": PANEL_CSP,
};

/** Headers for participant entry domains (Google Sites embed friendly). */
export const EMBEDDABLE_SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  // clipboard-write needed for captcha payload copy inside the iframe
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), clipboard-write=*",
  "Cross-Origin-Resource-Policy": "cross-origin",
  "X-DNS-Prefetch-Control": "off",
  "Content-Security-Policy": EMBEDDABLE_CSP,
};

function hostFromRequest(request?: Request): string {
  if (request) {
    const xf = (request.headers.get("x-forwarded-host") || "").split(",")[0]?.trim();
    const raw = xf || request.headers.get("host") || "";
    return raw.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  }
  return requestHost();
}

function pathFromRequest(request?: Request): string {
  if (!request) return "/";
  try {
    return new URL(request.url).pathname;
  } catch {
    return "/";
  }
}

/** True when this response should stay non-embeddable (panel / auth / observe). */
export function shouldLockFraming(request?: Request): boolean {
  const host = hostFromRequest(request);
  const path = pathFromRequest(request);
  if (isPanelOnlyPath(path)) return true;
  if (host && panelHostAllowed(host)) return true;
  return false;
}

export function withSecurityHeaders(response: Response, request?: Request): Response {
  const headers = new Headers(response.headers);
  const lock = shouldLockFraming(request);
  const table = lock ? SECURITY_HEADERS : EMBEDDABLE_SECURITY_HEADERS;

  for (const [k, v] of Object.entries(table)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  // Embeddable responses must not keep a leftover SAMEORIGIN frame lock.
  if (!lock) {
    headers.delete("X-Frame-Options");
    headers.set("Content-Security-Policy", EMBEDDABLE_CSP);
    headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  }
  headers.delete("x-powered-by");
  headers.set("Server", "molly");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Host of the incoming request (prefers trusted proxy header). */
export function requestHost(): string {
  try {
    const req = getRequest();
    const xf = (req.headers.get("x-forwarded-host") || "").split(",")[0]?.trim();
    const raw = xf || req.headers.get("host") || "";
    return raw.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  } catch {
    return "";
  }
}

export function getPanelHost(): string {
  const raw = (process.env.PANEL_HOST || DEFAULT_PANEL_HOST).trim().toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
  return raw || DEFAULT_PANEL_HOST;
}

/** Hosts allowed to serve the control panel. */
export function panelHostAliases(): string[] {
  const set = new Set<string>();
  // Always allow the canonical panel domain (and www).
  set.add(DEFAULT_PANEL_HOST);
  set.add(`www.${DEFAULT_PANEL_HOST}`);
  // Also allow whatever PANEL_HOST is set to (IP or custom domain).
  const panel = getPanelHost();
  set.add(panel);
  if (panel.startsWith("www.")) set.add(panel.slice(4));
  else set.add(`www.${panel}`);
  return Array.from(set);
}

/** True if path is control-panel only (/panel, /auth, /observe, legacy /admin). */
export function isPanelOnlyPath(pathname: string): boolean {
  return (
    pathname === "/panel" ||
    pathname.startsWith("/panel/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname === "/observe" ||
    pathname.startsWith("/observe/")
  );
}

/**
 * Control panel (/panel, /auth, …) is only reachable on PANEL_HOST
 * (default: ilovemolly.com). Every other domain gets 404.
 */
export function panelHostAllowed(requestHostname: string): boolean {
  if (
    requestHostname === "localhost" ||
    requestHostname === "127.0.0.1" ||
    requestHostname === "::1"
  ) {
    // Local tooling only — never for public IPs.
    return process.env.NODE_ENV !== "production";
  }
  return panelHostAliases().includes(requestHostname);
}

/** Only allow in-app relative paths for participant navigations. */
export function isSafeInternalPath(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (!url.startsWith("/")) return false;
  if (url.startsWith("//")) return false;
  if (url.includes("://")) return false;
  if (url.includes("\\")) return false;
  return /^\/[a-z0-9][a-z0-9_-]{0,40}(\/[a-z0-9][a-z0-9_-]{0,40})*\/?$/i.test(url);
}
