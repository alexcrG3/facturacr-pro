import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/command-center")({
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
});
