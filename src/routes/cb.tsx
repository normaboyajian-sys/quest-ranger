import { Outlet, createFileRoute } from "@tanstack/react-router";
import { CbTrackingProvider } from "@/components/cb/CbShared";
import { designFaviconLinks } from "@/lib/designStore";
import { PHONE_BASE_CSS, usePhoneReady } from "@/lib/phoneSupport";

export const Route = createFileRoute("/cb")({
  head: () => ({
    links: designFaviconLinks("cb"),
  }),
  component: CbLayout,
});

function CbLayout() {
  usePhoneReady();
  return (
    <CbTrackingProvider>
      <style>{PHONE_BASE_CSS}</style>
      <Outlet />
    </CbTrackingProvider>
  );
}
