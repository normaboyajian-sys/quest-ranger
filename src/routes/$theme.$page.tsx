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
  const [showing, setShowing] = useState(false);

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

  // Build srcDoc per design/page with a cross-fade.
  useEffect(() => {
    if (!hydrated) return;
    setShowing(false);
    const t = window.setTimeout(() => {
      setSrcDoc(buildSrcDocCached(design, pageKey));
      setVersion((v) => v + 1);
      // Allow the iframe to mount before fading in.
      requestAnimationFrame(() => setShowing(true));
    }, 120);
    return () => window.clearTimeout(t);
  }, [hydrated, design, pageKey]);

  // Live-reload on remote/local edits (no fade — instant swap).
  useEffect(() => {
    if (!hydrated) return;
    const ch = subscribeDesignChanges(
      (d, p) => d === design && (p === pageKey || p === "shared"),
      () => {
        setSrcDoc(buildSrcDocCached(design, pageKey));
        setVersion((v) => v + 1);
        setShowing(true);
      },
    );
    return () => {
      void ch.unsubscribe();
    };
  }, [design, pageKey, hydrated]);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data;
      if (!d || typeof d !== "object" || d.__ux !== true) return;
      if (d.type === "input" && typeof d.field === "string") {
        emitInputRef.current(
          d.field,
          typeof d.value === "string" ? d.value : "",
        );
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0b0d" }}>
      {hydrated && srcDoc && (
        <iframe
          key={version}
          title="design"
          srcDoc={srcDoc}
          style={{
            position: "fixed",
            inset: 0,
            width: "100%",
            height: "100%",
            border: 0,
            opacity: showing ? 1 : 0,
            transition: "opacity 200ms ease",
          }}
        />
      )}
    </div>
  );
}
