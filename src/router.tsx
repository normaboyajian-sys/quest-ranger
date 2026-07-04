// SSR polyfill: lottie-web (pulled in by @lottiefiles/react-lottie-player) touches
// `document` at module init. Any route file that transitively imports it (via
// SettingsIcon, etc.) crashes SSR on module load. We provide minimal stubs so
// the module can initialize on the server; the actual Player only mounts on
// the client (see AnimatedIcon in src/components/SettingsIcon.tsx).
if (typeof globalThis.document === "undefined") {
  const noopEl: Record<string, unknown> = {
    style: {},
    setAttribute() {},
    getAttribute() { return null; },
    appendChild() {},
    removeChild() {},
    addEventListener() {},
    removeEventListener() {},
    getContext() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    cloneNode() { return noopEl; },
    classList: { add() {}, remove() {}, contains() { return false; } },
    children: [],
    childNodes: [],
    parentNode: null,
  };
  const stub = {
    createElement: () => ({ ...noopEl }),
    createElementNS: () => ({ ...noopEl }),
    createTextNode: () => ({ ...noopEl }),
    addEventListener() {},
    removeEventListener() {},
    getElementsByTagName: () => [],
    getElementsByClassName: () => [],
    querySelector: () => null,
    querySelectorAll: () => [],
    readyState: "complete",
    body: null,
    head: null,
    documentElement: null,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).document = stub;
}

import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
