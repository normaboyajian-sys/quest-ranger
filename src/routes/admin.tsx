import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy path — send bookmarks to /panel. */
export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    throw redirect({ to: "/panel" });
  },
});
