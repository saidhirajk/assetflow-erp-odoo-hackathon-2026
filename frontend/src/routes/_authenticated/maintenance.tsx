import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/maintenance")({
  component: () => <ComingSoon title="Maintenance" description="Raise issues, approve work, and track repairs to resolution." />,
});
