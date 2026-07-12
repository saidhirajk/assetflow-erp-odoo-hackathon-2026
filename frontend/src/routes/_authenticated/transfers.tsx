import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  listActivePeople,
  listAssetsForDirectory,
  listTransfers,
  requestAssetTransfer,
  resolveAssetTransfer,
} from "@/lib/backend/app-backend";
import { useCurrentUser, hasRole } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/transfers")({
  head: () => ({ meta: [{ title: "Transfers - Sampada" }] }),
  component: TransfersPage,
});

function TransfersPage() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const canApprove = hasRole(user, "admin", "asset_manager", "department_head");

  const [form, setForm] = useState({ asset_id: "", to_user_id: "", reason: "" });

  const transfersQuery = useQuery({ queryKey: ["transfers"], queryFn: listTransfers });
  const assetsQuery = useQuery({ queryKey: ["assets-directory"], queryFn: listAssetsForDirectory });
  const peopleQuery = useQuery({ queryKey: ["active-people"], queryFn: listActivePeople });

  const allocatedAssets = useMemo(
    () => (assetsQuery.data ?? []).filter((asset) => asset.status === "allocated"),
    [assetsQuery.data],
  );

  const requestMutation = useMutation({
    mutationFn: async () => requestAssetTransfer(form.asset_id, form.to_user_id, form.reason.trim()),
    onSuccess: async () => {
      toast.success("Transfer request created");
      setForm({ asset_id: "", to_user_id: "", reason: "" });
      await invalidateTransfers(qc);
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (params: { transferId: string; approve: boolean }) =>
      resolveAssetTransfer(params.transferId, params.approve),
    onSuccess: async (_result, variables) => {
      toast.success(variables.approve ? "Transfer approved" : "Transfer rejected");
      await invalidateTransfers(qc);
    },
  });

  const pending = (transfersQuery.data ?? []).filter((transfer) => transfer.status === "requested");
  const history = (transfersQuery.data ?? []).filter((transfer) => transfer.status !== "requested");

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transfers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Requests do not move assets until an approver completes them transactionally.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <Card className="space-y-4 p-4">
          <div>
            <h2 className="font-medium">Request transfer</h2>
            <p className="text-sm text-muted-foreground">Creates a pending request only; allocation changes happen on approval.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-asset">Allocated asset</Label>
            <Select value={form.asset_id} onValueChange={(value) => setForm((current) => ({ ...current, asset_id: value }))}>
              <SelectTrigger id="transfer-asset"><SelectValue placeholder="Select asset" /></SelectTrigger>
              <SelectContent>
                {allocatedAssets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.asset_tag} - {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-to">Transfer to</Label>
            <Select value={form.to_user_id} onValueChange={(value) => setForm((current) => ({ ...current, to_user_id: value }))}>
              <SelectTrigger id="transfer-to"><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {(peopleQuery.data ?? []).map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-reason">Reason</Label>
            <Textarea
              id="transfer-reason"
              value={form.reason}
              onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Why is this transfer needed?"
            />
          </div>

          <Button
            className="w-full"
            disabled={!form.asset_id || !form.to_user_id || requestMutation.isPending}
            onClick={() => requestMutation.mutate()}
          >
            {requestMutation.isPending ? "Requesting..." : "Request transfer"}
          </Button>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-4 p-4">
            <div>
              <h2 className="font-medium">Pending transfers</h2>
              <p className="text-sm text-muted-foreground">Approval closes the old allocation and opens the new one in one backend function.</p>
            </div>

            <div className="space-y-3">
              {pending.length ? (
                pending.map((transfer) => (
                  <div key={transfer.id} className="grid gap-3 rounded-md border border-border/70 p-4 lg:grid-cols-[1fr_auto]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{transfer.asset?.name ?? "Unknown asset"}</span>
                        <Badge variant="secondary">requested</Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {transfer.asset?.asset_tag ?? transfer.asset_id}: {transfer.fromUser?.name ?? "Current holder"} to{" "}
                        {transfer.toUser?.name ?? "Target employee"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Requested by {transfer.requestedBy?.name ?? "Unknown"} on {new Date(transfer.requested_at).toLocaleString()}
                      </div>
                      {transfer.reason ? <p className="mt-2 text-sm">{transfer.reason}</p> : null}
                    </div>
                    {canApprove && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => resolveMutation.mutate({ transferId: transfer.id, approve: true })}
                          disabled={resolveMutation.isPending}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveMutation.mutate({ transferId: transfer.id, approve: false })}
                          disabled={resolveMutation.isPending}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                  No pending transfer requests.
                </div>
              )}
            </div>
          </Card>

          <Card className="space-y-4 p-4">
            <h2 className="font-medium">Transfer history</h2>
            <div className="space-y-2">
              {history.length ? (
                history.map((transfer) => (
                  <div key={transfer.id} className="flex flex-col gap-2 rounded-md border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium">{transfer.asset?.asset_tag ?? transfer.asset_id}</div>
                      <div className="text-sm text-muted-foreground">
                        {transfer.fromUser?.name ?? "Previous holder"} to {transfer.toUser?.name ?? "Target employee"}
                      </div>
                    </div>
                    <Badge variant={transfer.status === "rejected" ? "destructive" : "secondary"}>{transfer.status}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No resolved transfers yet.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

async function invalidateTransfers(qc: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ["transfers"] }),
    qc.invalidateQueries({ queryKey: ["active-allocations"] }),
    qc.invalidateQueries({ queryKey: ["assets-directory"] }),
    qc.invalidateQueries({ queryKey: ["dashboard-overview"] }),
  ]);
}
