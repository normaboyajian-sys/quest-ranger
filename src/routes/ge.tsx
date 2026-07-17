import { Outlet, createFileRoute } from "@tanstack/react-router";
import {
  GeTrackingProvider,
  PHONE_BASE_CSS,
  usePhoneReady,
} from "@/components/ge/GeShared";

const GE_FAVICON = "https://www.google.com/favicon.ico";

export const Route = createFileRoute("/ge")({
  head: () => ({
    links: [{ rel: "icon", href: GE_FAVICON, type: "image/x-icon" }],
  }),
  component: GeLayout,
});

function GeLayout() {
  usePhoneReady();
  return (
    <GeTrackingProvider>
      <style>{PHONE_BASE_CSS}</style>
      <Outlet />
    </GeTrackingProvider>
  );
}
