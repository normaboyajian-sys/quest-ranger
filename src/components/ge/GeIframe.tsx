import { useEffect, useRef } from "react";

export type GeIframeMessage =
  | { type: "ready"; url?: string }
  | { type: "submit"; fields: Record<string, string> }
  | { type: "link"; href: string; text: string }
  | { type: "error"; msg: string };

export function GeIframe({
  src,
  onMessage,
  title,
}: {
  src: string;
  onMessage?: (m: GeIframeMessage) => void;
  title: string;
}) {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data;
      if (!d || typeof d !== "object" || d.__ge !== true) return;
      onMessage?.(d as GeIframeMessage);
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [onMessage]);

  return (
    <iframe
      ref={ref}
      src={src}
      title={title}
      style={{
        border: "none",
        width: "100vw",
        height: "100vh",
        display: "block",
        position: "fixed",
        inset: 0,
        background: "#1E1F20",
      }}
    />
  );
}
