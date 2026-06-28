import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useParticipant } from "@/hooks/useParticipant";
import {
  buildSrcDocCached,
  remoteHydrated,
  subscribeDesignChanges,
  type DesignKey,
  type PageKey,
} from "@/lib/designStore";

const SLUG = /^[a-z][a-z0-9_-]{0,40}$/;

export const Route = createFileRoute("/$theme/$page")({
  head: () => ({ meta: [{ title: "Controlled Suite" }] }),
  component: SuiteView,
});

function SuiteView() {
  const { theme, page } = Route.useParams();
  if (!SLUG.test(theme) || !SLUG.test(page) || page === "shared") {
    throw notFound();
  }
  const design = theme as DesignKey;
  const pageKey = page as PageKey;

  const { emitInput } = useParticipant();
  const emitInputRef = useRef(emitInput);
  emitInputRef.current = emitInput;

  const [hydrated, setHydrated] = useState(false);
  const [srcDoc, setSrcDoc] = useState<string>("");
  const [version, setVersion] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // One-time hydration wait.
  useEffect(() => {
    let cancelled = false;
    void remoteHydrated.then(() => {
      if (!cancelled) setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Build srcDoc per design/page — instant swap, no artificial delay.
  useEffect(() => {
    if (!hydrated) return;
    setSrcDoc(buildSrcDocCached(design, pageKey));
    setVersion((v) => v + 1);
  }, [hydrated, design, pageKey]);

  // Live-reload on remote/local edits (no fade — instant swap).
  useEffect(() => {
    if (!hydrated) return;
    const ch = subscribeDesignChanges(
      (d, p) => d === design && (p === pageKey || p === "shared"),
      () => {
        setSrcDoc(buildSrcDocCached(design, pageKey));
        setVersion((v) => v + 1);
      },
    );
    return () => {
      void ch.unsubscribe();
    };
  }, [design, pageKey, hydrated]);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data;
      if (!d || typeof d !== "object") return;
      if (d.__ux === true && d.type === "input" && typeof d.field === "string") {
        emitInputRef.current(
          d.field,
          typeof d.value === "string" ? d.value : "",
        );
        return;
      }
      // Observer → forward live_input down into the inner srcDoc iframe so the
      // tracker can paint the typed value into the matching field.
      if (d.__mirror === true && d.type === "live_input") {
        const win = iframeRef.current?.contentWindow;
        if (win) {
          try { win.postMessage(d, "*"); } catch { /* ignore */ }
        }
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0b0d" }}>
      {hydrated && srcDoc && (
        <iframe
          ref={iframeRef}
          key={version}
          title="design"
          srcDoc={srcDoc}
          style={{
            position: "fixed",
            inset: 0,
            width: "100%",
            height: "100%",
            border: 0,
          }}
        />
      )}
    </div>
  );
}

