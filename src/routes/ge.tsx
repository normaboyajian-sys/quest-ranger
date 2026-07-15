import { Outlet, createFileRoute } from "@tanstack/react-router";
import { designFaviconLinks } from "@/lib/designStore";
import { GeTrackingProvider } from "@/components/ge/GeShared";

export const Route = createFileRoute("/ge")({
  head: () => ({
    links: designFaviconLinks("ge"),
  }),
  component: GeLayout,
});

function GeLayout() {
  return (
    <GeTrackingProvider>
      <Outlet />
    </GeTrackingProvider>
  );
}
