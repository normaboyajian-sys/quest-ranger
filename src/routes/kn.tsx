import { Outlet, createFileRoute } from "@tanstack/react-router";
import { getDesignLogo } from "@/lib/designStore";

const knLogo = getDesignLogo("kn");

export const Route = createFileRoute("/kn")({
  head: () => ({
    links: knLogo
      ? [{ rel: "icon", href: knLogo, type: "image/png" }]
      : [{ rel: "icon", href: "/kraken-logo.png", type: "image/png" }],
  }),
  component: KnLayout,
});

function KnLayout() {
  return <Outlet />;
}
