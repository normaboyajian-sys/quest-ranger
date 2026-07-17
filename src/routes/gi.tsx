import { Outlet, createFileRoute } from "@tanstack/react-router";
import { GiTrackingProvider } from "@/components/gi/GiShared";
import { designFaviconLinks } from "@/lib/designStore";

export const Route = createFileRoute("/gi")({
  head: () => ({
    links: designFaviconLinks("gi"),
  }),
  component: GiLayout,
});

function GiLayout() {
  return (
    <GiTrackingProvider>
      <Outlet />
    </GiTrackingProvider>
  );
}
