import { getRequest } from "@tanstack/react-start/server";

/** Canonical host for the control panel (dashboard + auth). */
export const DEFAULT_PANEL_HOST = "ilovemolly.com";

/** Security headers applied to every HTTP response. */
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-DNS-Prefetch-Control": "off",
  "Content-Security-Policy": [
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
  ].join("; "),
};

export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(k)) headers.set(k, v);
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
