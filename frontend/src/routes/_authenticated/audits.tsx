import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Check, AlertTriangle, AlertCircle, Calendar, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import {
  listAuditCycles,
  createAuditCycle,
  startAuditCycle,
  closeAuditCycle,
  listAuditItems,
  markAuditItem,
  listActiveDepartments,
  listEmployeeDirectory,
  type AuditCycleRecord,
  type AuditItemRecord,
} from "@/lib/backend/app-backend";
import { useCurrentUser, hasRole } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/audits")({
  head: () => ({ meta: [{ title: "Audits - AssetFlow" }] }),
  component: AuditsPage,
});

function AuditsPage() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const isAdminOrMgr = hasRole(user, "admin", "asset_manager");

  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Data Queries
  const cyclesQuery = useQuery({ queryKey: ["audit-cycles"], queryFn: listAuditCycles });
  const deptsQuery = useQuery({ queryKey: ["departments"], queryFn: listActiveDepartments });
  const usersQuery = useQuery({ queryKey: ["employees"], queryFn: listEmployeeDirectory });
  
  const itemsQuery = useQuery({
    queryKey: ["audit-items", selectedCycleId],
    queryFn: () => listAuditItems(selectedCycleId!),
    enabled: !!selectedCycleId,
  });

  const cycles = cyclesQuery.data ?? [];
  const activeCycles = cycles.filter((c) => c.status !== "closed");
  const closedCycles = cycles.filter((c) => c.status === "closed");
  const selectedCycle = cycles.find((c) => c.id === selectedCycleId);

  // Mutations
  const startMutation = useMutation({
    mutationFn: startAuditCycle,
    onSuccess: () => {
      toast.success("Audit cycle started");
      qc.invalidateQueries({ queryKey: ["audit-cycles"] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: closeAuditCycle,
    onSuccess: (res: any) => {
      toast.success(`Audit closed. ${res.missing_count} assets marked as Lost.`);
      setSelectedCycleId(null);
      qc.invalidateQueries({ queryKey: ["audit-cycles"] });
      qc.invalidateQueries({ queryKey: ["assets-directory"] });
    },
  });

  const markMutation = useMutation({
    mutationFn: (params: { itemId: string; result: AuditItemRecord["result"]; notes: string }) =>
      markAuditItem(params.itemId, params.result, params.notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-items", selectedCycleId] });
    },
  });

  // Create Form State
  const [newCycle, setNewCycle] = useState({
    name: "",
    scope: "department" as "department" | "location",
    departmentId: "",
    location: "",
    auditorId: "",
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createAuditCycle({
        name: newCycle.name,
        scope_department_id: newCycle.scope === "department" ? newCycle.departmentId : null,
        scope_location: newCycle.scope === "location" ? newCycle.location : null,
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        auditor_ids: [newCycle.auditorId],
      }),
    onSuccess: () => {
      toast.success("Audit cycle created");
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ["audit-cycles"] });
    },
  });

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Asset Audits</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage physical verification cycles and discrepancy reports.</p>
        </div>
        {isAdminOrMgr && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Create Audit Cycle</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Audit Cycle</DialogTitle>
                <DialogDescription>Define the scope of assets to be physically verified.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Audit Name</Label>
                  <Input value={newCycle.name} onChange={e => setNewCycle(s => ({ ...s, name: e.target.value }))} placeholder="e.g. Q3 Engineering IT Audit" />
                </div>
                <div className="space-y-2">
                  <Label>Scope Type</Label>
                  <Select value={newCycle.scope} onValueChange={(v: any) => setNewCycle(s => ({ ...s, scope: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="department">By Department</SelectItem>
                      <SelectItem value="location">By Location</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newCycle.scope === "department" ? (
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={newCycle.departmentId} onValueChange={v => setNewCycle(s => ({ ...s, departmentId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        {(deptsQuery.data ?? []).map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input value={newCycle.location} onChange={e => setNewCycle(s => ({ ...s, location: e.target.value }))} placeholder="e.g. Building A" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Primary Auditor</Label>
                  <Select value={newCycle.auditorId} onValueChange={v => setNewCycle(s => ({ ...s, auditorId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {(usersQuery.data ?? []).map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button disabled={createMutation.isPending || !newCycle.name || !newCycle.auditorId} onClick={() => createMutation.mutate()}>
                  {createMutation.isPending ? "Creating..." : "Create Cycle"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[350px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Active Cycles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeCycles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded">No active audits.</p>
              ) : activeCycles.map(cycle => (
                <div
                  key={cycle.id}
                  onClick={() => setSelectedCycleId(cycle.id)}
                  className={`p-3 rounded-md border cursor-pointer transition-colors ${selectedCycleId === cycle.id ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'}`}
                >
                  <div className="font-medium text-sm">{cycle.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={cycle.status === 'draft' ? "outline" : "default"} className="text-[10px] uppercase">
                      {cycle.status.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{cycle.itemCount} items</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Audit History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {closedCycles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded">No closed audits.</p>
              ) : closedCycles.map(cycle => (
                <div
                  key={cycle.id}
                  onClick={() => setSelectedCycleId(cycle.id)}
                  className={`p-3 rounded-md border cursor-pointer transition-colors ${selectedCycleId === cycle.id ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'}`}
                >
                  <div className="font-medium text-sm">{cycle.name}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {format(new Date(cycle.closed_at!), "MMM d, yyyy")}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div>
          {!selectedCycle ? (
            <Card className="h-full min-h-[400px] flex items-center justify-center bg-muted/20 border-dashed">
              <div className="text-center text-muted-foreground">
                <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p>Select an audit cycle to view checklist</p>
              </div>
            </Card>
          ) : (
            <Card className="flex flex-col h-full min-h-[600px]">
              <CardHeader className="border-b bg-muted/10 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{selectedCycle.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {selectedCycle.department ? `Department: ${selectedCycle.department.name}` : `Location: ${selectedCycle.scope_location}`}
                      {" • "}{selectedCycle.itemCount} assets
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {selectedCycle.status === "draft" && isAdminOrMgr && (
                      <Button size="sm" onClick={() => startMutation.mutate(selectedCycle.id)} disabled={startMutation.isPending}>
                        Start Audit
                      </Button>
                    )}
                    {selectedCycle.status === "in_progress" && isAdminOrMgr && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="default" className="bg-blue-600 hover:bg-blue-700">Close Cycle</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Close Audit Cycle</DialogTitle>
                            <DialogDescription>
                              This action is irreversible. All items marked as "Missing" will permanently change their asset status to "Lost".
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4 bg-muted/50 rounded-md p-4 space-y-2 mt-2">
                            <div className="flex justify-between text-sm">
                              <span>Total Items:</span>
                              <span className="font-medium">{selectedCycle.itemCount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Verified/Damaged:</span>
                              <span className="font-medium text-emerald-600">
                                {(itemsQuery.data ?? []).filter(i => i.result !== "missing" && i.result !== "pending").length}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm font-medium text-red-600 border-t pt-2 mt-2">
                              <span>To be marked LOST:</span>
                              <span>{(itemsQuery.data ?? []).filter(i => i.result === "missing").length}</span>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button disabled={closeMutation.isPending} variant="destructive" onClick={() => closeMutation.mutate(selectedCycle.id)}>
                              {closeMutation.isPending ? "Closing..." : "Confirm Closure"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-auto">
                {itemsQuery.isLoading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading items...</div>
                ) : (
                  <div className="divide-y">
                    {(itemsQuery.data ?? []).map(item => (
                      <AuditItemRow
                        key={item.id}
                        item={item}
                        readOnly={selectedCycle.status !== "in_progress"}
                        onMark={(result, notes) => markMutation.mutate({ itemId: item.id, result, notes })}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function AuditItemRow({ item, readOnly, onMark }: { item: AuditItemRecord; readOnly: boolean; onMark: (result: AuditItemRecord["result"], notes: string) => void }) {
  const [localNotes, setLocalNotes] = useState(item.notes ?? "");

  return (
    <div className={`p-4 grid gap-4 lg:grid-cols-[1fr_auto] items-start ${item.result === "pending" ? "" : "bg-muted/10"}`}>
      <div>
        <div className="font-medium flex items-center gap-2">
          {item.asset?.asset_tag} - {item.asset?.name}
          {item.result === "verified" && <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200"><Check className="h-3 w-3 mr-1"/> Verified</Badge>}
          {item.result === "missing" && <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200"><AlertTriangle className="h-3 w-3 mr-1"/> Missing</Badge>}
          {item.result === "damaged" && <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200"><AlertCircle className="h-3 w-3 mr-1"/> Damaged</Badge>}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Last known: {item.asset?.location ?? "Unknown"} • S/N: {item.asset?.serial_number ?? "N/A"}
        </div>
        {readOnly && item.notes && (
          <div className="mt-2 text-sm italic text-muted-foreground border-l-2 pl-2">Note: {item.notes}</div>
        )}
        {!readOnly && (
          <Textarea
            value={localNotes}
            onChange={e => setLocalNotes(e.target.value)}
            onBlur={() => {
              if (localNotes !== (item.notes ?? "")) {
                onMark(item.result, localNotes);
              }
            }}
            placeholder="Condition notes..."
            className="mt-3 h-10 min-h-[40px] text-sm"
          />
        )}
      </div>
      
      {!readOnly && (
        <RadioGroup
          value={item.result}
          onValueChange={(val: any) => onMark(val, localNotes)}
          className="flex flex-row gap-4"
        >
          <div className="flex items-center space-x-1.5 border rounded px-3 py-2 cursor-pointer hover:bg-muted">
            <RadioGroupItem value="verified" id={`v-${item.id}`} />
            <Label htmlFor={`v-${item.id}`} className="cursor-pointer">Verified</Label>
          </div>
          <div className="flex items-center space-x-1.5 border rounded px-3 py-2 cursor-pointer hover:bg-muted">
            <RadioGroupItem value="damaged" id={`d-${item.id}`} />
            <Label htmlFor={`d-${item.id}`} className="cursor-pointer">Damaged</Label>
          </div>
          <div className="flex items-center space-x-1.5 border rounded px-3 py-2 cursor-pointer hover:bg-muted">
            <RadioGroupItem value="missing" id={`m-${item.id}`} />
            <Label htmlFor={`m-${item.id}`} className="cursor-pointer">Missing</Label>
          </div>
        </RadioGroup>
      )}
    </div>
  );
}
