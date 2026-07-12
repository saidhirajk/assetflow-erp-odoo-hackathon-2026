import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/bookings")({
  component: () => <ComingSoon title="Bookings" description="Reserve shared resources with conflict-free scheduling." />,
});
