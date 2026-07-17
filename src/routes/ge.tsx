import { Outlet, createFileRoute } from "@tanstack/react-router";
import { GeTrackingProvider } from "@/components/ge/GeShared";

const GE_FAVICON = "https://www.google.com/favicon.ico";

export const Route = createFileRoute("/ge")({
  head: () => ({
    links: [{ rel: "icon", href: GE_FAVICON, type: "image/x-icon" }],
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
