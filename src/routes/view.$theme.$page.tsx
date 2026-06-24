import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useParticipant } from "@/hooks/useParticipant";
import {
  applyBundle,
  buildSrcDoc,
  type DesignKey,
  type PageKey,
} from "@/lib/designStore";
import { joinChannel } from "@/lib/orchestrator";

export const Route = createFileRoute("/view/$theme/$page")({
  head: () => ({ meta: [{ title: "Controlled Suite" }] }),
  component: SuiteView,
});

function SuiteView() {
  const { theme, page } = Route.useParams();
  if (!["red", "blue"].includes(theme) || !["home", "contact"].includes(page))
    throw notFound();
  const design = theme as DesignKey;
  const pageKey = page as PageKey;

  const { emitInput, approved } = useParticipant();
  const emitInputRef = useRef(emitInput);
  emitInputRef.current = emitInput;

  const [srcDoc, setSrcDoc] = useState<string>(() => buildSrcDoc(design, pageKey));
  const [version, setVersion] = useState(0);

  // Live updates from admin
  useEffect(() => {
    const ch = joinChannel({
      key: `viewer_${Math.random().toString(36).slice(2, 8)}`,
      onDesignPublish: (p) => {
        applyBundle({ design: p.design, page: p.page, html: p.html, css: p.css, js: p.js });
        if (p.design === design && p.page === pageKey) {
          setSrcDoc(buildSrcDoc(design, pageKey));
          setVersion((v) => v + 1);
        }
      },
    });
    ch.subscribe();
    return () => {
      void ch.unsubscribe();
    };
  }, [design, pageKey]);

  // Rebuild when design/page changes
  useEffect(() => {
    setSrcDoc(buildSrcDoc(design, pageKey));
  }, [design, pageKey]);

  // Receive input events from iframe
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data;
      if (!d || typeof d !== "object" || d.__ux !== true) return;
      if (d.type === "input" && typeof d.field === "string") {
        emitInputRef.current(d.field, typeof d.value === "string" ? d.value : "");
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  if (!approved) return null;

  return (
    <iframe
      key={version}
      title="design"
      srcDoc={srcDoc}
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: 0 }}
    />
  );
}
