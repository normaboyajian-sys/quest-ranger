import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useParticipant } from "@/hooks/useParticipant";
import {
  buildSrcDocCached,
  loadAll,
  subscribeDesignChanges,
  type DesignKey,
  type PageKey,
} from "@/lib/designStore";

const SLUG = /^[a-z][a-z0-9_-]{0,40}$/;

export const Route = createFileRoute("/view/$theme/$page")({
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

  const [srcDoc, setSrcDoc] = useState<string>(() =>
    buildSrcDocCached(design, pageKey),
  );
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSrcDoc(buildSrcDocCached(design, pageKey));
    void loadAll().then(() => {
      if (cancelled) return;
      setSrcDoc(buildSrcDocCached(design, pageKey));
      setVersion((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [design, pageKey]);

  useEffect(() => {
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
  }, [design, pageKey]);

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
      }}
    />
  );
}
