import { Outlet, createFileRoute } from "@tanstack/react-router";
import { KnTrackingProvider } from "@/components/kn/KnShared";
import { designFaviconLinks } from "@/lib/designStore";
import { PHONE_BASE_CSS, usePhoneReady } from "@/lib/phoneSupport";

export const Route = createFileRoute("/kn")({
  head: () => ({
    links: designFaviconLinks("kn"),
  }),
  component: KnLayout,
});

function KnLayout() {
  usePhoneReady();
  return (
    <KnTrackingProvider>
      <style>{PHONE_BASE_CSS}</style>
      <Outlet />
    </KnTrackingProvider>
  );
}
