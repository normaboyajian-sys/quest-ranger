import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Google-style top loading bar: thin blue indeterminate bar at the very top
 * of the viewport, shown whenever the router is transitioning between GE (Google) routes.
 */
export function TopProgressBar() {
  const { isLoading, pathname } = useRouterState({
    select: (s) => ({
      isLoading: s.status === "pending" || s.isLoading || s.isTransitioning,
      pathname: s.location.pathname,
    }),
  });
  const onGe = pathname.startsWith("/ge");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let hideT: ReturnType<typeof setTimeout> | undefined;
    if (isLoading && onGe) {
      setVisible(true);
    } else if (visible) {
      hideT = setTimeout(() => setVisible(false), 350);
    }
    return () => { if (hideT) clearTimeout(hideT); };
  }, [isLoading, onGe, visible]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes ge-topbar-slide {
          0%   { transform: translateX(-100%) scaleX(0.4); }
          50%  { transform: translateX(20%)   scaleX(0.6); }
          100% { transform: translateX(120%)  scaleX(0.4); }
        }
        .ge-topbar-root {
          position: fixed; top: 0; left: 0; right: 0;
          height: 3px; z-index: 2147483647; pointer-events: none;
          background: rgba(11,87,208,0.12); overflow: hidden;
        }
        .ge-topbar-bar {
          position: absolute; inset: 0;
          background: linear-gradient(90deg, #0B57D0 0%, #4285F4 50%, #A8C7FA 100%);
          transform-origin: left center;
          animation: ge-topbar-slide 1.1s ease-in-out infinite;
        }
        @media (prefers-color-scheme: dark) {
          .ge-topbar-root { background: rgba(168,199,250,0.12); }
          .ge-topbar-bar { background: linear-gradient(90deg, #A8C7FA 0%, #4285F4 50%, #0B57D0 100%); }
        }
      `}</style>
      <div className="ge-topbar-root" aria-hidden="true">
        <div className="ge-topbar-bar" />
      </div>
    </>
  );
}
