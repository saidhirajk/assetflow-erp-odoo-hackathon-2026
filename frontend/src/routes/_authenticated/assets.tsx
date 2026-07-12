import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/assets")({
  component: () => <ComingSoon title="Assets" description="Register, search, and manage every asset in your organization." />,
});
