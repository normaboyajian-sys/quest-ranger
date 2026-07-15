import { Outlet, createFileRoute } from "@tanstack/react-router";
import { designFaviconLinks } from "@/lib/designStore";

export const Route = createFileRoute("/cb")({
  head: () => ({
    links: designFaviconLinks("cb"),
  }),
  component: CbLayout,
});

function CbLayout() {
  return <Outlet />;
}
