import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  listAssetsForDirectory,
  listMaintenanceRequests,
  raiseMaintenanceRequest,
  updateMaintenanceStatus,
  type MaintenanceRequestRecord,
} from "@/lib/backend/app-backend";
import { useCurrentUser, hasRole } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/maintenance")({
  head: () => ({ meta: [{ title: "Maintenance - Sampada" }] }),
  component: MaintenancePage,
});

function MaintenancePage() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const isAdminOrMgr = hasRole(user, "admin", "asset_manager");

  const [form, setForm] = useState({
    asset_id: "",
    issue_description: "",
    priority: "medium" as MaintenanceRequestRecord["priority"],
    photo_url: "",
  });
  const [technicians, setTechnicians] = useState<Record<string, string>>({});
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  const assetsQuery = useQuery({ queryKey: ["assets-directory"], queryFn: listAssetsForDirectory });
  const maintenanceQuery = useQuery({ queryKey: ["maintenance-requests"], queryFn: listMaintenanceRequests });

  const activeAssets = useMemo(
    () => (assetsQuery.data ?? []).filter((asset) => asset.status !== "retired" && asset.status !== "disposed"),
    [assetsQuery.data],
  );

  const raiseMutation = useMutation({
    mutationFn: async () =>
      raiseMaintenanceRequest({
        asset_id: form.asset_id,
        issue_description: form.issue_description.trim(),
        priority: form.priority,
        photo_url: form.photo_url.trim(),
      }),
    onSuccess: async () => {
      toast.success("Maintenance request raised");
      setForm({ asset_id: "", issue_description: "", priority: "medium", photo_url: "" });
      await invalidateMaintenance(qc);
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (params: { request: MaintenanceRequestRecord; status: MaintenanceRequestRecord["status"] }) =>
      updateMaintenanceStatus({
        request_id: params.request.id,
        status: params.status,
        technician_name: technicians[params.request.id] ?? "",
        resolution_notes: resolutionNotes[params.request.id] ?? "",
      }),
    onSuccess: async (_result, variables) => {
      toast.success(`Maintenance ${variables.status.replaceAll("_", " ")}`);
      await invalidateMaintenance(qc);
    },
  });

  const requests = maintenanceQuery.data ?? [];
  const pending = requests.filter((request) => request.status === "pending");
  const inProgress = requests.filter((request) =>
    ["approved", "technician_assigned", "in_progress"].includes(request.status),
  );
  const closed = requests.filter(
    (request) =>
      ["rejected", "resolved"].includes(request.status) &&
      (isAdminOrMgr || request.raised_by_user_id === user?.userId)
  );

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Raise issues, approve work, and move assets through controlled repair states.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <Card className="space-y-4 p-4">
          <div>
            <h2 className="font-medium">Raise request</h2>
            <p className="text-sm text-muted-foreground">Creating a request keeps the asset status unchanged until approval.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenance-asset">Asset</Label>
            <Select value={form.asset_id} onValueChange={(value) => setForm((current) => ({ ...current, asset_id: value }))}>
              <SelectTrigger id="maintenance-asset"><SelectValue placeholder="Select asset" /></SelectTrigger>
              <SelectContent>
                {activeAssets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.asset_tag} - {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenance-priority">Priority</Label>
            <Select
              value={form.priority}
              onValueChange={(value) => setForm((current) => ({ ...current, priority: value as MaintenanceRequestRecord["priority"] }))}
            >
              <SelectTrigger id="maintenance-priority"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenance-issue">Issue description</Label>
            <Textarea
              id="maintenance-issue"
              value={form.issue_description}
              onChange={(event) => setForm((current) => ({ ...current, issue_description: event.target.value }))}
              placeholder="Describe the issue"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenance-photo">Photo URL</Label>
            <Input
              id="maintenance-photo"
              value={form.photo_url}
              onChange={(event) => setForm((current) => ({ ...current, photo_url: event.target.value }))}
            />
          </div>

          <Button
            className="w-full"
            disabled={!form.asset_id || !form.issue_description.trim() || raiseMutation.isPending}
            onClick={() => raiseMutation.mutate()}
          >
            {raiseMutation.isPending ? "Raising..." : "Raise request"}
          </Button>
        </Card>

        <div className="space-y-4">
          {isAdminOrMgr && (
            <>
              <Card className="space-y-4 p-4">
                <div>
              <h2 className="font-medium">Approval queue</h2>
              <p className="text-sm text-muted-foreground">Approval is the exact moment the asset enters Under Maintenance.</p>
            </div>
            <RequestList
              requests={pending}
              empty="No pending maintenance requests."
              action={(request) => (
                <div className="flex gap-2">
                  <Button size="sm" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ request, status: "approved" })}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ request, status: "rejected" })}>
                    Reject
                  </Button>
                </div>
              )}
            />
          </Card>

          <Card className="space-y-4 p-4">
            <h2 className="font-medium">In progress</h2>
            <RequestList
              requests={inProgress}
              empty="No maintenance work in progress."
              action={(request) => (
                <div className="grid gap-2 sm:w-80">
                  <Input
                    value={technicians[request.id] ?? request.technician_name ?? ""}
                    onChange={(event) => setTechnicians((current) => ({ ...current, [request.id]: event.target.value }))}
                    placeholder="Technician name"
                  />
                  <Textarea
                    value={resolutionNotes[request.id] ?? ""}
                    onChange={(event) => setResolutionNotes((current) => ({ ...current, [request.id]: event.target.value }))}
                    placeholder="Resolution notes"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ request, status: "technician_assigned" })}>
                      Assign
                    </Button>
                    <Button size="sm" variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ request, status: "in_progress" })}>
                      Start work
                    </Button>
                    <Button size="sm" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ request, status: "resolved" })}>
                      Resolve
                    </Button>
                  </div>
                </div>
              )}
            />
          </Card>
          </>
          )}

          <Card className="space-y-4 p-4">
            <h2 className="font-medium">Closed requests</h2>
            <RequestList requests={closed} empty="No closed maintenance requests." />
          </Card>
        </div>
      </div>
    </div>
  );
}

function RequestList({
  requests,
  empty,
  action,
}: {
  requests: MaintenanceRequestRecord[];
  empty: string;
  action?: (request: MaintenanceRequestRecord) => ReactNode;
}) {
  if (!requests.length) {
    return <div className="rounded-md border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">{empty}</div>;
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <div key={request.id} className="grid gap-3 rounded-md border border-border/70 p-4 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{request.asset?.name ?? "Unknown asset"}</span>
              <Badge variant={request.priority === "critical" ? "destructive" : "secondary"}>{request.priority}</Badge>
              <Badge variant="outline">{request.status.replaceAll("_", " ")}</Badge>
            </div>
            <p className="mt-2 text-sm">{request.issue_description}</p>
            <div className="mt-1 text-xs text-muted-foreground">
              {request.asset?.asset_tag ?? request.asset_id} - raised by {request.raisedBy?.name ?? "Unknown"} on{" "}
              {new Date(request.created_at).toLocaleString()}
            </div>
            {request.technician_name ? <div className="mt-1 text-xs text-muted-foreground">Technician: {request.technician_name}</div> : null}
          </div>
          {action ? action(request) : null}
        </div>
      ))}
    </div>
  );
}

async function invalidateMaintenance(qc: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ["maintenance-requests"] }),
    qc.invalidateQueries({ queryKey: ["assets-directory"] }),
    qc.invalidateQueries({ queryKey: ["dashboard-overview"] }),
  ]);
}
