import { Outlet, createFileRoute } from "@tanstack/react-router";
import { designFaviconLinks } from "@/lib/designStore";

export const Route = createFileRoute("/gi")({
  head: () => ({
    links: designFaviconLinks("gi"),
  }),
  component: GiLayout,
});

function GiLayout() {
  return <Outlet />;
}
