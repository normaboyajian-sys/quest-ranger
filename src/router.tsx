// IMPORTANT: keep the SSR DOM shim as the FIRST import so its side effects run
// before any module that touches `document` at module init (e.g. lottie-web).
import "./lib/ssr-dom-shim";

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
