import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useParticipant } from "@/hooks/useParticipant";

/** Transparent 1×1 GIF — no visible favicon on the focus tab. */
const BLANK_FAVICON =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "loading." }],
    links: [
      { rel: "icon", href: BLANK_FAVICON },
      { rel: "shortcut icon", href: BLANK_FAVICON },
    ],
  }),
  component: FocusRoom,
});

function FocusRoom() {
  // Keep the participant gate / heartbeat running — just hide the UI.
  useParticipant();

  useEffect(() => {
    const frames = ["loading.", "loading..", "loading..."];
    let i = 0;
    document.title = frames[0];

    // Strip any real favicon the browser may have cached from other routes.
    try {
      for (const el of Array.from(
        document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon']"),
      )) {
        el.parentNode?.removeChild(el);
      }
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = BLANK_FAVICON;
      document.head.appendChild(link);
    } catch {
      /* ignore */
    }

    const id = window.setInterval(() => {
      i = (i + 1) % frames.length;
      document.title = frames[i];
    }, 600);

    return () => {
      window.clearInterval(id);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
      }}
    />
  );
}
