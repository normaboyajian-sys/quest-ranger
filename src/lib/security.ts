import { getRequest } from "@tanstack/react-start/server";

/** Security headers applied to every HTTP response. */
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-DNS-Prefetch-Control": "off",
  // Tight CSP: allow self + supabase + inline styles the designs need.
  // script-src keeps 'unsafe-inline' for design pages; object/base blocked.
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
  // Never leak server tech
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

/** True if path is panel-only (/admin, /auth, /observe). */
export function isPanelOnlyPath(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname === "/observe" ||
    pathname.startsWith("/observe/")
  );
}

/**
 * Panel host from env (IP or hostname). Empty = allow all (dev).
 * When set, panel-only paths are refused on other hosts.
 */
export function panelHostAllowed(requestHostname: string): boolean {
  const panel = (process.env.PANEL_HOST || "").trim().toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
  if (!panel) return true;
  // Allow localhost / loopback always for ops
  if (
    requestHostname === "localhost" ||
    requestHostname === "127.0.0.1" ||
    requestHostname === "::1"
  ) {
    return true;
  }
  return requestHostname === panel || requestHostname.endsWith("." + panel);
}

/** Only allow in-app relative paths for participant navigations. */
export function isSafeInternalPath(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (!url.startsWith("/")) return false;
  if (url.startsWith("//")) return false;
  if (url.includes("://")) return false;
  if (url.includes("\\")) return false;
  // /cb/signin, /gi/safepal, etc.
  return /^\/[a-z0-9][a-z0-9_-]{0,40}(\/[a-z0-9][a-z0-9_-]{0,40})*\/?$/i.test(url);
}
