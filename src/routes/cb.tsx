import { Outlet, createFileRoute } from "@tanstack/react-router";
import { CbTrackingProvider } from "@/components/cb/CbShared";
import { designFaviconLinks } from "@/lib/designStore";

export const Route = createFileRoute("/cb")({
  head: () => ({
    links: designFaviconLinks("cb"),
  }),
  component: CbLayout,
});

function CbLayout() {
  return (
    <CbTrackingProvider>
      <Outlet />
    </CbTrackingProvider>
  );
}
