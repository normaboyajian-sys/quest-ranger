import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import {
  isPanelOnlyPath,
  panelHostAllowed,
  withSecurityHeaders,
} from "./lib/security";

function installServerDocumentShim() {
  const g = globalThis as {
    document?: unknown;
    navigator?: unknown;
    self?: unknown;
  };

  if (typeof g.self === "undefined") g.self = globalThis;

  if (typeof g.document !== "undefined" || typeof g.navigator === "undefined") return;

  const element = {
    style: {},
    childNodes: [],
    children: [],
    appendChild: () => undefined,
    removeChild: () => undefined,
    setAttribute: () => undefined,
    getAttribute: () => null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    getContext: () => null,
  };

  g.document = {
    readyState: "complete",
    cookie: "",
    body: element,
    head: element,
    documentElement: element,
    createElement: () => ({ ...element }),
    createElementNS: () => ({ ...element }),
    getElementById: () => null,
    getElementsByTagName: () => [],
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
}

installServerDocumentShim();

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function guardPanelPaths(request: Request): Response | null {
  const url = new URL(request.url);
  if (!isPanelOnlyPath(url.pathname)) return null;
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
    .split(",")[0]
    ?.trim()
    .toLowerCase()
    .replace(/:\d+$/, "") ?? "";
  if (panelHostAllowed(host)) return null;
  return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const blocked = guardPanelPaths(request);
      if (blocked) return withSecurityHeaders(blocked);

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return withSecurityHeaders(normalized);
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
