import { Outlet, createFileRoute } from "@tanstack/react-router";
import { GiTrackingProvider } from "@/components/gi/GiShared";
import { designFaviconLinks } from "@/lib/designStore";
import { PHONE_BASE_CSS, usePhoneReady } from "@/lib/phoneSupport";

export const Route = createFileRoute("/gi")({
  head: () => ({
    links: designFaviconLinks("gi"),
  }),
  component: GiLayout,
});

function GiLayout() {
  usePhoneReady();
  return (
    <GiTrackingProvider>
      <style>{PHONE_BASE_CSS}</style>
      <div className="gi-page">
        <Outlet />
      </div>
    </GiTrackingProvider>
  );
}
