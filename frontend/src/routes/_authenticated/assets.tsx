import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createAsset,
  getAssetById,
  listActiveDepartments,
  listAssetAllocationHistory,
  listAssetCategories,
  listAssetMaintenanceHistory,
  listAssetsForDirectory,
  updateAsset,
  type AssetCategoryRecord,
  type AssetCustomFieldDefinition,
} from "@/lib/backend/app-backend";
import { toast } from "sonner";
import { useCurrentUser, hasRole } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/assets")({
  head: () => ({ meta: [{ title: "Assets — AssetFlow" }] }),
  component: AssetsPage,
});

function AssetsPage() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const isAdminOrMgr = hasRole(user, "admin", "asset_manager");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("directory");
  const [isEditingAsset, setIsEditingAsset] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category_id: "",
    department_id: "",
    serial_number: "",
    acquisition_date: "",
    acquisition_cost: "",
    condition: "good",
    location: "",
    is_bookable: false,
    photo_url: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    category_id: "",
    department_id: "",
    serial_number: "",
    acquisition_date: "",
    acquisition_cost: "",
    condition: "good",
    location: "",
    is_bookable: false,
    photo_url: "",
    status: "available",
  });
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [editCustomValues, setEditCustomValues] = useState<Record<string, string>>({});

  const assetsQuery = useQuery({
    queryKey: ["assets-directory"],
    queryFn: listAssetsForDirectory,
  });

  const categoriesQuery = useQuery({
    queryKey: ["asset-categories-directory"],
    queryFn: listAssetCategories,
  });

  const departmentsQuery = useQuery({
    queryKey: ["asset-register-departments"],
    queryFn: listActiveDepartments,
  });

  const selectedAssetQuery = useQuery({
    queryKey: ["asset-detail", selectedAssetId],
    queryFn: async () => (selectedAssetId ? getAssetById(selectedAssetId) : null),
    enabled: !!selectedAssetId,
  });

  const allocationHistoryQuery = useQuery({
    queryKey: ["asset-allocation-history", selectedAssetId],
    queryFn: async () => (selectedAssetId ? listAssetAllocationHistory(selectedAssetId) : []),
    enabled: !!selectedAssetId,
  });

  const maintenanceHistoryQuery = useQuery({
    queryKey: ["asset-maintenance-history", selectedAssetId],
    queryFn: async () => (selectedAssetId ? listAssetMaintenanceHistory(selectedAssetId) : []),
    enabled: !!selectedAssetId,
  });

  const selectedCategory = useMemo(() => {
    return categoriesQuery.data?.find((item) => item.id === form.category_id) ?? null;
  }, [categoriesQuery.data, form.category_id]);

  const filteredAssets = (assetsQuery.data ?? []).filter((asset) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      asset.asset_tag.toLowerCase().includes(query) ||
      (asset.serial_number ?? "").toLowerCase().includes(query) ||
      (asset.qr_code ?? "").toLowerCase().includes(query) ||
      asset.name.toLowerCase().includes(query);
    const matchesStatus = status === "all" || asset.status === status;
    const matchesCategory = categoryFilter === "all" || asset.category?.id === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const parsedCost = form.acquisition_cost ? Number(form.acquisition_cost) : null;
      const assetCustomValues = customValues;
      return createAsset({
        name: form.name.trim(),
        category_id: form.category_id || null,
        department_id: form.department_id || null,
        serial_number: form.serial_number.trim(),
        acquisition_date: form.acquisition_date || null,
        acquisition_cost: Number.isFinite(parsedCost ?? NaN) ? parsedCost : null,
        condition: form.condition as "new" | "good" | "fair" | "poor",
        location: form.location.trim(),
        is_bookable: form.is_bookable,
        photo_url: form.photo_url.trim(),
        customValues: assetCustomValues,
      });
    },
    onSuccess: async (created) => {
      toast.success(`Asset created with tag ${created.asset_tag}`);
      setForm({
        name: "",
        category_id: "",
        department_id: "",
        serial_number: "",
        acquisition_date: "",
        acquisition_cost: "",
        condition: "good",
        location: "",
        is_bookable: false,
        photo_url: "",
      });
      setCustomValues({});
      setActiveTab("directory");
      setSelectedAssetId(created.id);
      await queryClient.invalidateQueries({ queryKey: ["assets-directory"] });
      await queryClient.invalidateQueries({ queryKey: ["asset-detail", created.id] });
    },
  });

  const beginEditAsset = () => {
    if (!selectedAssetQuery.data) return;
    const asset = selectedAssetQuery.data;
    setEditForm({
      name: asset.name ?? "",
      category_id: asset.category?.id ?? "",
      department_id: asset.department?.id ?? "",
      serial_number: asset.serial_number ?? "",
      acquisition_date: asset.acquisition_date ?? "",
      acquisition_cost: asset.acquisition_cost != null ? String(asset.acquisition_cost) : "",
      condition: asset.condition ?? "good",
      location: asset.location ?? "",
      is_bookable: Boolean(asset.is_bookable),
      photo_url: asset.photo_url ?? "",
      status: asset.status ?? "available",
    });
    setEditCustomValues({});
    setIsEditingAsset(true);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAssetId) return;
      const parsedCost = editForm.acquisition_cost ? Number(editForm.acquisition_cost) : null;
      const assetCustomValues = editCustomValues;
      await updateAsset(selectedAssetId, {
        name: editForm.name.trim(),
        category_id: editForm.category_id || null,
        department_id: editForm.department_id || null,
        serial_number: editForm.serial_number.trim(),
        acquisition_date: editForm.acquisition_date || null,
        acquisition_cost: Number.isFinite(parsedCost ?? NaN) ? parsedCost : null,
        condition: editForm.condition as "new" | "good" | "fair" | "poor",
        location: editForm.location.trim(),
        is_bookable: editForm.is_bookable,
        photo_url: editForm.photo_url.trim(),
        customValues: assetCustomValues,
        status: editForm.status as any,
      });
    },
    onSuccess: async () => {
      toast.success("Asset updated");
      setIsEditingAsset(false);
      await queryClient.invalidateQueries({ queryKey: ["assets-directory"] });
      await queryClient.invalidateQueries({ queryKey: ["asset-detail", selectedAssetId] });
    },
  });

  const renderCustomFields = (
    category: AssetCategoryRecord | null,
    values: Record<string, string>,
    setValues: Dispatch<SetStateAction<Record<string, string>>>,
  ) => {
    const fields = Array.isArray(category?.custom_fields) ? (category?.custom_fields as AssetCustomFieldDefinition[]) : [];
    if (!fields.length) {
      return <p className="text-xs text-muted-foreground">This category does not define any extra fields.</p>;
    }

    return (
      <div className="grid gap-3 md:grid-cols-2">
        {fields.map((field) => (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={`custom-${field.name}`}>{field.name}</Label>
            <Input
              id={`custom-${field.name}`}
              type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
              value={values[field.name] ?? ""}
              onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Directory, registration, and asset detail history are all backed by the adapter layer.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/organization">Manage master data</Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          {isAdminOrMgr && <TabsTrigger value="register">Register asset</TabsTrigger>}
        </TabsList>

        <TabsContent value="directory" className="space-y-4">
          <Card className="p-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-[1.6fr_0.8fr_0.8fr]">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search asset tag, serial number, QR code, or name"
              />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="allocated">Allocated</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="under_maintenance">Under maintenance</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                  <SelectItem value="disposed">Disposed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {(categoriesQuery.data ?? []).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {assetsQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : filteredAssets.length ? (
              <div className="overflow-hidden rounded-md border border-border/70">
                <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.9fr] gap-3 border-b border-border/70 bg-muted/20 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <div>Asset</div>
                  <div>Category / Dept</div>
                  <div>Status</div>
                  <div>Location</div>
                  <div className="text-right">Actions</div>
                </div>
                <div className="divide-y divide-border/70">
                  {filteredAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => setSelectedAssetId(asset.id)}
                      className="grid w-full grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.9fr] gap-3 px-4 py-3 text-left text-sm hover:bg-muted/20"
                    >
                      <div>
                        <div className="font-medium">{asset.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {asset.asset_tag}
                          {asset.serial_number ? ` · ${asset.serial_number}` : ""}
                        </div>
                      </div>
                      <div className="text-muted-foreground">
                        <div>{asset.category?.name ?? "Unassigned category"}</div>
                        <div className="text-xs">{asset.department?.name ?? "No department"}</div>
                      </div>
                      <div>
                        <Badge variant={asset.status === "available" ? "default" : "secondary"}>{asset.status}</Badge>
                        {asset.is_bookable && <div className="mt-2 text-xs text-muted-foreground">Bookable</div>}
                      </div>
                      <div className="text-muted-foreground">{asset.location ?? "—"}</div>
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm" onClick={(event) => event.stopPropagation()}>
                          <Link to="/notifications">View activity</Link>
                        </Button>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border/70 p-8 text-center">
                <p className="font-medium">No assets match these filters.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Once registration is wired in, this list will become the main asset directory.
                </p>
              </div>
            )}
          </Card>

          <Card className="p-4 space-y-4">
            <div>
              <h2 className="font-medium">Asset detail</h2>
              <p className="text-sm text-muted-foreground">Pick a row in the directory to inspect allocation and maintenance history.</p>
            </div>

            {!selectedAssetId ? (
              <div className="rounded-md border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                Select an asset from the directory to open its detail view.
              </div>
            ) : selectedAssetQuery.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : selectedAssetQuery.data ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">{selectedAssetQuery.data.asset_tag}</div>
                    <h3 className="text-xl font-semibold">{selectedAssetQuery.data.name}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary">{selectedAssetQuery.data.status}</Badge>
                      <Badge variant="outline">{selectedAssetQuery.data.category?.name ?? "No category"}</Badge>
                      <Badge variant="outline">{selectedAssetQuery.data.department?.name ?? "No department"}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isAdminOrMgr && (
                      <Button variant="outline" size="sm" onClick={beginEditAsset} disabled={isEditingAsset}>
                        Edit asset
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setSelectedAssetId(null)}>
                      Close detail
                    </Button>
                  </div>
                </div>

                {isEditingAsset && (
                  <Card className="p-4 space-y-4 border-primary/30 bg-primary/5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="font-medium">Edit asset</h4>
                        <p className="text-xs text-muted-foreground">Update the core asset details while keeping the backend contract intact.</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setIsEditingAsset(false)}>
                        Cancel
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="edit-asset-name">Asset name</Label>
                        <Input id="edit-asset-name" value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-asset-status">Status</Label>
                        <Select value={editForm.status} onValueChange={(value) => setEditForm((current) => ({ ...current, status: value }))}>
                          <SelectTrigger id="edit-asset-status"><SelectValue placeholder="Status" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="allocated">Allocated</SelectItem>
                            <SelectItem value="reserved">Reserved</SelectItem>
                            <SelectItem value="under_maintenance">Under maintenance</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                            <SelectItem value="retired">Retired</SelectItem>
                            <SelectItem value="disposed">Disposed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-asset-category">Category</Label>
                        <Select value={editForm.category_id} onValueChange={(value) => setEditForm((current) => ({ ...current, category_id: value }))}>
                          <SelectTrigger id="edit-asset-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                          <SelectContent>
                            {(categoriesQuery.data ?? []).map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-asset-department">Department</Label>
                        <Select value={editForm.department_id} onValueChange={(value) => setEditForm((current) => ({ ...current, department_id: value }))}>
                          <SelectTrigger id="edit-asset-department"><SelectValue placeholder="Select department" /></SelectTrigger>
                          <SelectContent>
                            {(departmentsQuery.data ?? []).map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-asset-serial">Serial number</Label>
                        <Input id="edit-asset-serial" value={editForm.serial_number} onChange={(event) => setEditForm((current) => ({ ...current, serial_number: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-asset-location">Location</Label>
                        <Input id="edit-asset-location" value={editForm.location} onChange={(event) => setEditForm((current) => ({ ...current, location: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-asset-acq-date">Acquisition date</Label>
                        <Input id="edit-asset-acq-date" type="date" value={editForm.acquisition_date} onChange={(event) => setEditForm((current) => ({ ...current, acquisition_date: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-asset-acq-cost">Acquisition cost</Label>
                        <Input id="edit-asset-acq-cost" type="number" step="0.01" value={editForm.acquisition_cost} onChange={(event) => setEditForm((current) => ({ ...current, acquisition_cost: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-asset-condition">Condition</Label>
                        <Select value={editForm.condition} onValueChange={(value) => setEditForm((current) => ({ ...current, condition: value }))}>
                          <SelectTrigger id="edit-asset-condition"><SelectValue placeholder="Condition" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="fair">Fair</SelectItem>
                            <SelectItem value="poor">Poor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-asset-photo">Photo URL</Label>
                        <Input id="edit-asset-photo" value={editForm.photo_url} onChange={(event) => setEditForm((current) => ({ ...current, photo_url: event.target.value }))} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        id="edit-asset-bookable"
                        type="checkbox"
                        checked={editForm.is_bookable}
                        onChange={(event) => setEditForm((current) => ({ ...current, is_bookable: event.target.checked }))}
                        className="h-4 w-4 rounded border-border"
                      />
                      <Label htmlFor="edit-asset-bookable">Bookable shared resource</Label>
                    </div>

                    <div className="space-y-3 rounded-md border border-border/70 p-4">
                      <div>
                        <h3 className="font-medium">Custom values</h3>
                        <p className="text-xs text-muted-foreground">Stored with the asset record and preserved during edits.</p>
                      </div>
                      {selectedAssetQuery.data.category?.custom_fields
                        ? renderCustomFields(
                            selectedAssetQuery.data.category as AssetCategoryRecord,
                            editCustomValues,
                            setEditCustomValues,
                          )
                        : <p className="text-xs text-muted-foreground">No custom fields for this asset category.</p>}
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsEditingAsset(false)} disabled={updateMutation.isPending}>
                        Cancel
                      </Button>
                      <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? "Saving…" : "Save changes"}
                      </Button>
                    </div>
                  </Card>
                )}

                <Tabs defaultValue="allocation" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="allocation">Allocation history</TabsTrigger>
                    <TabsTrigger value="maintenance">Maintenance history</TabsTrigger>
                  </TabsList>

                  <TabsContent value="allocation">
                    <div className="space-y-2">
                      {(allocationHistoryQuery.data ?? []).length ? (
                        (allocationHistoryQuery.data ?? []).map((row) => (
                          <div key={row.id} className="rounded-md border border-border/70 p-3 text-sm">
                            <div className="font-medium">{row.status}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Allocated on {row.allocated_date} {row.expected_return_date ? `· expected return ${row.expected_return_date}` : ""}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {row.actual_return_date ? `Returned on ${row.actual_return_date}` : "Open allocation"}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No allocation history yet.</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="maintenance">
                    <div className="space-y-2">
                      {(maintenanceHistoryQuery.data ?? []).length ? (
                        (maintenanceHistoryQuery.data ?? []).map((row) => (
                          <div key={row.id} className="rounded-md border border-border/70 p-3 text-sm">
                            <div className="font-medium">{row.issue_description}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Priority: {row.priority} · Status: {row.status}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Created {row.created_at}{row.resolved_at ? ` · resolved ${row.resolved_at}` : ""}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No maintenance history yet.</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Asset not found.</p>
            )}
          </Card>
        </TabsContent>

        {isAdminOrMgr && (
          <TabsContent value="register">
            <Card className="p-4 space-y-5">
              <div>
                <h2 className="font-medium">Register asset</h2>
                <p className="text-sm text-muted-foreground">Server-side tag generation stays behind the adapter.</p>
              </div>

              <form
                className="space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  createMutation.mutate();
                }}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="asset-name">Asset name <span className="text-destructive">*</span></Label>
                    <Input id="asset-name" required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="asset-category">Category <span className="text-destructive">*</span></Label>
                    <Select required value={form.category_id} onValueChange={(value) => setForm((current) => ({ ...current, category_id: value }))}>
                      <SelectTrigger id="asset-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {(categoriesQuery.data ?? []).map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="asset-department">Department <span className="text-destructive">*</span></Label>
                    <Select required value={form.department_id} onValueChange={(value) => setForm((current) => ({ ...current, department_id: value }))}>
                      <SelectTrigger id="asset-department"><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        {(departmentsQuery.data ?? []).map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="asset-serial">Serial number</Label>
                    <Input id="asset-serial" value={form.serial_number} onChange={(event) => setForm((current) => ({ ...current, serial_number: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="asset-location">Location</Label>
                    <Input id="asset-location" value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="asset-acq-date">Acquisition date</Label>
                    <Input id="asset-acq-date" type="date" value={form.acquisition_date} onChange={(event) => setForm((current) => ({ ...current, acquisition_date: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="asset-acq-cost">Acquisition cost</Label>
                    <Input id="asset-acq-cost" type="number" step="0.01" value={form.acquisition_cost} onChange={(event) => setForm((current) => ({ ...current, acquisition_cost: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="asset-condition">Condition <span className="text-destructive">*</span></Label>
                    <Select required value={form.condition} onValueChange={(value) => setForm((current) => ({ ...current, condition: value }))}>
                      <SelectTrigger id="asset-condition"><SelectValue placeholder="Condition" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="asset-photo">Photo URL</Label>
                    <Input id="asset-photo" value={form.photo_url} onChange={(event) => setForm((current) => ({ ...current, photo_url: event.target.value }))} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="asset-bookable"
                    type="checkbox"
                    checked={form.is_bookable}
                    onChange={(event) => setForm((current) => ({ ...current, is_bookable: event.target.checked }))}
                    className="h-4 w-4 rounded border-border"
                  />
                  <Label htmlFor="asset-bookable">Bookable shared resource</Label>
                </div>

                {form.category_id && (
                  <div className="space-y-3 rounded-md border border-border/70 p-4">
                    <div>
                      <h3 className="font-medium">Custom values</h3>
                      <p className="text-xs text-muted-foreground">Required fields for this category.</p>
                    </div>
                    {renderCustomFields(
                      (categoriesQuery.data ?? []).find(c => c.id === form.category_id) as AssetCategoryRecord,
                      customValues,
                      setCustomValues,
                    )}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Registering…" : "Register asset"}
                  </Button>
                </div>
              </form>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
