import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  closeAuditCycle,
  createAuditCycle,
  listActiveDepartments,
  listActivePeople,
  listAuditCycles,
  markAuditItem,
} from "@/lib/backend/app-backend";

export const Route = createFileRoute("/_authenticated/audits")({
  head: () => ({ meta: [{ title: "Audits - Sampada" }] }),
  component: AuditsPage,
});

function AuditsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("list");
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);

  const cyclesQuery = useQuery({ queryKey: ["audit-cycles"], queryFn: listAuditCycles });
  const departmentsQuery = useQuery({ queryKey: ["audit-depts"], queryFn: listActiveDepartments });
  const peopleQuery = useQuery({ queryKey: ["audit-people"], queryFn: listActivePeople });

  const [createForm, setCreateForm] = useState({
    scope_department_id: "none",
    scope_location: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    auditor_user_ids: [] as string[],
  });

  const createMutation = useMutation({
    mutationFn: () => createAuditCycle({
      scope_department_id: createForm.scope_department_id === "none" ? null : createForm.scope_department_id,
      scope_location: createForm.scope_location,
      start_date: createForm.start_date,
      end_date: createForm.end_date,
      auditor_user_ids: createForm.auditor_user_ids,
    }),
    onSuccess: () => {
      toast.success("Audit cycle created");
      setActiveTab("list");
      qc.invalidateQueries({ queryKey: ["audit-cycles"] });
    },
  });

  const markMutation = useMutation({
    mutationFn: ({ auditId, assetId, result, notes }: { auditId: string; assetId: string; result: string; notes: string }) =>
      markAuditItem(auditId, assetId, result, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-cycles"] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: (auditId: string) => closeAuditCycle(auditId),
    onSuccess: (data) => {
      toast.success(`Audit closed. ${data.count} discrepancies found.`);
      setSelectedAuditId(null);
      qc.invalidateQueries({ queryKey: ["audit-cycles"] });
    },
  });

  const selectedCycle = cyclesQuery.data?.find((c) => c.id === selectedAuditId);

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Asset Audits</h1>
        <p className="text-sm text-muted-foreground mt-1">Create audit cycles, mark assets as verified/missing/damaged, and close with discrepancy reports.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Audit Cycles</TabsTrigger>
          <TabsTrigger value="create">Create Cycle</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {cyclesQuery.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : cyclesQuery.data?.length ? (
            <div className="space-y-3">
              {cyclesQuery.data.map((cycle) => (
                <Card key={cycle.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={cycle.status === "closed" ? "secondary" : "default"}>{cycle.status}</Badge>
                        <span className="text-sm font-medium">
                          {cycle.department_name || cycle.scope_location || "Org-wide"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {cycle.start_date} to {cycle.end_date} · {cycle.total_items} assets
                        {cycle.auditors.length > 0 && ` · ${cycle.auditors.map((a) => a.name).join(", ")}`}
                      </div>
                      {cycle.status === "in_progress" && (
                        <div className="flex gap-4 mt-2 text-xs">
                          <span className="text-green-600">Verified: {cycle.verified}</span>
                          <span className="text-red-600">Missing: {cycle.missing}</span>
                          <span className="text-yellow-600">Damaged: {cycle.damaged}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {cycle.status === "in_progress" && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => { setSelectedAuditId(cycle.id); setActiveTab("list"); }}>
                            Mark items
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => closeMutation.mutate(cycle.id)} disabled={closeMutation.isPending}>
                            Close cycle
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {selectedAuditId === cycle.id && cycle.items.length > 0 && (
                    <div className="mt-4 space-y-2 border-t border-border/70 pt-4">
                      <h4 className="text-sm font-medium">Asset Checklist</h4>
                      {cycle.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 rounded-md border border-border/70 p-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{item.asset_name}</div>
                            <div className="text-xs text-muted-foreground">{item.asset_tag}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {["Verified", "Missing", "Damaged"].map((r) => (
                              <Button
                                key={r}
                                size="sm"
                                variant={item.result === r.toLowerCase() ? "default" : "outline"}
                                onClick={() => markMutation.mutate({
                                  auditId: cycle.id, assetId: item.asset_id,
                                  result: r, notes: "",
                                })}
                                disabled={cycle.status !== "in_progress" || markMutation.isPending}
                              >
                                {r}
                              </Button>
                            ))}
                          </div>
                          <Badge variant={
                            item.result === "verified" ? "default" :
                            item.result === "missing" ? "destructive" :
                            item.result === "damaged" ? "secondary" : "outline"
                          }>
                            {item.result}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="font-medium">No audit cycles yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Create one to start a physical verification.</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="create">
          <Card className="p-4 space-y-5">
            <div>
              <h2 className="font-medium">Create audit cycle</h2>
              <p className="text-sm text-muted-foreground">Scope by department or location, assign auditors, and set date range.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Scope department (optional)</Label>
                <Select value={createForm.scope_department_id} onValueChange={(v) => setCreateForm((c) => ({ ...c, scope_department_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All departments</SelectItem>
                    {(departmentsQuery.data ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Scope location (optional)</Label>
                <Input value={createForm.scope_location} onChange={(e) => setCreateForm((c) => ({ ...c, scope_location: e.target.value }))} placeholder="e.g. Building A" />
              </div>
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input type="date" value={createForm.start_date} onChange={(e) => setCreateForm((c) => ({ ...c, start_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>End date</Label>
                <Input type="date" value={createForm.end_date} onChange={(e) => setCreateForm((c) => ({ ...c, end_date: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Auditors</Label>
              <div className="flex flex-wrap gap-2">
                {(peopleQuery.data ?? []).map((p) => (
                  <Button
                    key={p.id}
                    size="sm"
                    variant={createForm.auditor_user_ids.includes(p.id) ? "default" : "outline"}
                    onClick={() => setCreateForm((c) => ({
                      ...c,
                      auditor_user_ids: c.auditor_user_ids.includes(p.id)
                        ? c.auditor_user_ids.filter((id) => id !== p.id)
                        : [...c.auditor_user_ids, p.id],
                    }))}
                  >
                    {p.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create audit cycle"}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
