import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/allocations")({
  component: () => <ComingSoon title="Allocations" description="Assign assets to employees or departments and track returns." />,
});
