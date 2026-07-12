import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  allocateAsset,
  listActiveAllocations,
  listActiveDepartments,
  listActivePeople,
  listAssetsForDirectory,
  requestAssetTransfer,
  returnAllocation,
} from "@/lib/backend/app-backend";
import { useCurrentUser, hasRole } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/allocations")({
  head: () => ({ meta: [{ title: "Allocations - Sampada" }] }),
  component: AllocationsPage,
});

function AllocationsPage() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const isAdminOrMgr = hasRole(user, "admin", "asset_manager");
  const isDeptHead = hasRole(user, "department_head");

  const [form, setForm] = useState({
    asset_id: "",
    target_type: "user",
    user_id: "",
    department_id: "",
    expected_return_date: "",
  });
  const [returnNotes, setReturnNotes] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState<Record<string, unknown> | null>(null);

  const assetsQuery = useQuery({ queryKey: ["assets-directory"], queryFn: listAssetsForDirectory });
  const peopleQuery = useQuery({ queryKey: ["active-people"], queryFn: listActivePeople });
  const departmentsQuery = useQuery({ queryKey: ["active-departments"], queryFn: listActiveDepartments });
  const allocationsQuery = useQuery({ queryKey: ["active-allocations"], queryFn: listActiveAllocations });

  const visibleAllocations = useMemo(() => {
    const all = allocationsQuery.data ?? [];
    if (isAdminOrMgr) return all;
    return all.filter(
      (a) =>
        a.allocated_to_user_id === user?.userId ||
        (isDeptHead && a.allocated_to_department_id === user?.profile?.department_id)
    );
  }, [allocationsQuery.data, isAdminOrMgr, isDeptHead, user]);

  const availableAssets = useMemo(
    () => (assetsQuery.data ?? []).filter((asset) => asset.status === "available" || asset.status === "allocated"),
    [assetsQuery.data],
  );

  const selectedAsset = availableAssets.find((asset) => asset.id === form.asset_id);

  const allocateMutation = useMutation({
    mutationFn: async () =>
      allocateAsset({
        asset_id: form.asset_id,
        allocated_to_user_id: form.target_type === "user" ? form.user_id : null,
        allocated_to_department_id: form.target_type === "department" ? form.department_id : null,
        expected_return_date: form.expected_return_date || null,
      }),
    onSuccess: async (result) => {
      if (result.ok === false) {
        setConflict(result);
        toast.error("Asset is already allocated");
        return;
      }
      toast.success("Asset allocated");
      setConflict(null);
      setForm({ asset_id: "", target_type: "user", user_id: "", department_id: "", expected_return_date: "" });
      await invalidateOperations(qc);
    },
  });

  const transferMutation = useMutation({
    mutationFn: async () => requestAssetTransfer(form.asset_id, form.user_id, "Requested from allocation conflict"),
    onSuccess: async () => {
      toast.success("Transfer request created");
      setConflict(null);
      await invalidateOperations(qc);
    },
  });

  const returnMutation = useMutation({
    mutationFn: async (allocationId: string) => returnAllocation(allocationId, returnNotes[allocationId] ?? ""),
    onSuccess: async () => {
      toast.success("Allocation returned");
      setReturnNotes({});
      await invalidateOperations(qc);
    },
  });

  const canSubmit =
    form.asset_id &&
    ((form.target_type === "user" && form.user_id) || (form.target_type === "department" && form.department_id));

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Allocations</h1>
        <p className="mt-1 text-sm text-muted-foreground">Allocate available assets and close active returns through transactional backend rules.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        {isAdminOrMgr && (
          <Card className="space-y-4 p-4">
            <div>
            <h2 className="font-medium">Allocate asset</h2>
            <p className="text-sm text-muted-foreground">Conflicts return the current holder and offer a transfer request path.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="allocation-asset">Asset</Label>
            <Select value={form.asset_id} onValueChange={(value) => setForm((current) => ({ ...current, asset_id: value }))}>
              <SelectTrigger id="allocation-asset"><SelectValue placeholder="Select asset" /></SelectTrigger>
              <SelectContent>
                {availableAssets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.asset_tag} - {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="allocation-target">Allocate to</Label>
            <Select value={form.target_type} onValueChange={(value) => setForm((current) => ({ ...current, target_type: value }))}>
              <SelectTrigger id="allocation-target"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Employee</SelectItem>
                <SelectItem value="department">Department</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.target_type === "user" ? (
            <div className="space-y-2">
              <Label htmlFor="allocation-user">Employee</Label>
              <Select value={form.user_id} onValueChange={(value) => setForm((current) => ({ ...current, user_id: value }))}>
                <SelectTrigger id="allocation-user"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {(peopleQuery.data ?? []).map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="allocation-department">Department</Label>
              <Select value={form.department_id} onValueChange={(value) => setForm((current) => ({ ...current, department_id: value }))}>
                <SelectTrigger id="allocation-department"><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {(departmentsQuery.data ?? []).map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="expected-return">Expected return date</Label>
            <Input
              id="expected-return"
              type="date"
              value={form.expected_return_date}
              onChange={(event) => setForm((current) => ({ ...current, expected_return_date: event.target.value }))}
            />
          </div>

          {conflict && (
            <Alert>
              <AlertTitle>Currently held by {String(conflict.current_holder_name ?? "another holder")}</AlertTitle>
              <AlertDescription className="mt-2 space-y-3">
                <p>This asset has an active allocation, so the backend blocked the duplicate assignment.</p>
                {form.user_id && selectedAsset ? (
                  <Button size="sm" variant="outline" onClick={() => transferMutation.mutate()} disabled={transferMutation.isPending}>
                    Request transfer instead
                  </Button>
                ) : null}
              </AlertDescription>
            </Alert>
          )}

            <Button className="w-full" disabled={!canSubmit || allocateMutation.isPending} onClick={() => allocateMutation.mutate()}>
              {allocateMutation.isPending ? "Allocating..." : "Allocate asset"}
            </Button>
          </Card>
        )}

        <div className="space-y-4">
          {/* Overdue allocations — visually distinct per TDD Rule #7 */}
          {visibleAllocations.some((a) => a.status === "overdue") && (
            <Card className="border-amber-500/40 bg-amber-500/5 space-y-4 p-4">
              <div>
                <h2 className="font-medium flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <span>⚠ Overdue allocations</span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  These have passed their expected return date. Action required.
                </p>
              </div>
              <div className="space-y-3">
                {visibleAllocations
                  .filter((allocation) => allocation.status === "overdue")
                  .map((allocation) => (
                    <div
                      key={allocation.id}
                      className="grid gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 lg:grid-cols-[1fr_280px]"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{allocation.asset?.name ?? "Unknown asset"}</span>
                          <Badge variant="destructive">overdue</Badge>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {allocation.asset?.asset_tag ?? allocation.asset_id} assigned to{" "}
                          {allocation.allocatedToUser?.name ?? allocation.allocatedToDepartment?.name ?? "Unknown holder"}
                        </div>
                        <div className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                          Expected return: {allocation.expected_return_date}
                        </div>
                      </div>
                      {isAdminOrMgr && (
                        <div className="space-y-2">
                          <Textarea
                            value={returnNotes[allocation.id] ?? ""}
                            onChange={(event) =>
                              setReturnNotes((current) => ({ ...current, [allocation.id]: event.target.value }))
                            }
                            placeholder="Return condition notes"
                          />
                          <Button
                            className="w-full"
                            variant="outline"
                            disabled={returnMutation.isPending}
                            onClick={() => returnMutation.mutate(allocation.id)}
                          >
                            Mark returned
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {/* Active allocations */}
          <Card className="space-y-4 p-4">
            <div>
              <h2 className="font-medium">Active allocations</h2>
              <p className="text-sm text-muted-foreground">
                Returns update the allocation and asset state in one backend transaction.
              </p>
            </div>
            <div className="space-y-3">
              {visibleAllocations.filter((a) => a.status !== "overdue").length ? (
                visibleAllocations
                  .filter((allocation) => allocation.status !== "overdue")
                  .map((allocation) => (
                    <div
                      key={allocation.id}
                      className="grid gap-3 rounded-md border border-border/70 p-4 lg:grid-cols-[1fr_280px]"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{allocation.asset?.name ?? "Unknown asset"}</span>
                          <Badge variant="secondary">{allocation.status}</Badge>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {allocation.asset?.asset_tag ?? allocation.asset_id} assigned to{" "}
                          {allocation.allocatedToUser?.name ?? allocation.allocatedToDepartment?.name ?? "Unknown holder"}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Allocated {allocation.allocated_date}
                          {allocation.expected_return_date ? ` — expected ${allocation.expected_return_date}` : ""}
                        </div>
                      </div>
                      {isAdminOrMgr && (
                        <div className="space-y-2">
                          <Textarea
                            value={returnNotes[allocation.id] ?? ""}
                            onChange={(event) =>
                              setReturnNotes((current) => ({ ...current, [allocation.id]: event.target.value }))
                            }
                            placeholder="Return condition notes"
                          />
                          <Button
                            className="w-full"
                            variant="outline"
                            disabled={returnMutation.isPending}
                            onClick={() => returnMutation.mutate(allocation.id)}
                          >
                            Mark returned
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
              ) : (
                <div className="rounded-md border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                  No active allocations.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

async function invalidateOperations(qc: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ["active-allocations"] }),
    qc.invalidateQueries({ queryKey: ["assets-directory"] }),
    qc.invalidateQueries({ queryKey: ["transfers"] }),
    qc.invalidateQueries({ queryKey: ["dashboard-overview"] }),
  ]);
}
