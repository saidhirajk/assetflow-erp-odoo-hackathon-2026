import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  createAssetCategory,
  createDepartment,
  getCurrentUserSnapshot,
  listAssetCategories,
  listDepartmentsForSetup,
  listEmployeeDirectory,
  setUserRole,
  updateAssetCategory,
  updateDepartment,
  type AssetCustomFieldDefinition,
} from "@/lib/backend/app-backend";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "asset_manager", label: "Asset Manager" },
  { value: "department_head", label: "Department Head" },
  { value: "employee", label: "Employee" },
] as const;

type RoleValue = (typeof ROLE_OPTIONS)[number]["value"];

export const Route = createFileRoute("/_authenticated/organization")({
  beforeLoad: async () => {
    const currentUser = await getCurrentUserSnapshot();
    const isAdmin = currentUser?.roles.includes("admin");
    if (!currentUser || !isAdmin) throw redirect({ to: "/dashboard" });
    return { currentUser };
  },
  component: OrganizationSetupPage,
});

function OrganizationSetupPage() {
  const qc = useQueryClient();
  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    code: "",
    head_user_id: "",
    parent_department_id: "",
    status: "active" as "active" | "inactive",
  });
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    status: "active" as "active" | "inactive",
    customFields: [{ name: "", type: "text" as AssetCustomFieldDefinition["type"] }],
  });

  const departmentsQuery = useQuery({
    queryKey: ["organization-departments"],
    queryFn: listDepartmentsForSetup,
  });

  const categoriesQuery = useQuery({
    queryKey: ["organization-categories"],
    queryFn: listAssetCategories,
  });

  const employeesQuery = useQuery({
    queryKey: ["organization-employees"],
    queryFn: listEmployeeDirectory,
  });

  const promoteMutation = useMutation({
    mutationFn: async (params: { userId: string; role: RoleValue }) => {
      await setUserRole(params.userId, params.role);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["organization-employees"] });
      toast.success("Employee role updated");
    },
  });

  const createDepartmentMutation = useMutation({
    mutationFn: async () => {
      await createDepartment({
        name: departmentForm.name.trim(),
        code: departmentForm.code.trim().toUpperCase(),
        head_user_id: departmentForm.head_user_id || null,
        parent_department_id: departmentForm.parent_department_id || null,
        status: departmentForm.status,
      });
    },
    onSuccess: async () => {
      toast.success("Department created");
      setDepartmentForm({
        name: "",
        code: "",
        head_user_id: "",
        parent_department_id: "",
        status: "active",
      });
      await qc.invalidateQueries({ queryKey: ["organization-departments"] });
    },
  });

  const departmentStatusMutation = useMutation({
    mutationFn: async (params: { id: string; status: "active" | "inactive" }) => {
      await updateDepartment(params.id, { status: params.status });
    },
    onSuccess: async () => {
      toast.success("Department updated");
      await qc.invalidateQueries({ queryKey: ["organization-departments"] });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      const cleanedFields = categoryForm.customFields
        .map((field) => ({ name: field.name.trim(), type: field.type }))
        .filter((field) => field.name.length > 0);
      await createAssetCategory({
        name: categoryForm.name.trim(),
        status: categoryForm.status,
        custom_fields: cleanedFields,
      });
    },
    onSuccess: async () => {
      toast.success("Category created");
      setCategoryForm({
        name: "",
        status: "active",
        customFields: [{ name: "", type: "text" }],
      });
      await qc.invalidateQueries({ queryKey: ["organization-categories"] });
      await qc.invalidateQueries({ queryKey: ["asset-categories-directory"] });
    },
  });

  const categoryStatusMutation = useMutation({
    mutationFn: async (params: { id: string; status: "active" | "inactive" }) => {
      await updateAssetCategory(params.id, { status: params.status });
    },
    onSuccess: async () => {
      toast.success("Category updated");
      await qc.invalidateQueries({ queryKey: ["organization-categories"] });
      await qc.invalidateQueries({ queryKey: ["asset-categories-directory"] });
    },
  });

  const roleLabel: Record<RoleValue, string> = ROLE_OPTIONS.reduce(
    (labels, option) => {
      labels[option.value] = option.label;
      return labels;
    },
    {} as Record<RoleValue, string>,
  );

  const departmentOptions = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data]);
  const employeeOptions = useMemo(() => employeesQuery.data ?? [], [employeesQuery.data]);

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization setup</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage departments, categories, and employee access from one admin-only workspace.
        </p>
      </div>

      <Tabs defaultValue="departments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="categories">Asset categories</TabsTrigger>
          <TabsTrigger value="employees">Employee directory</TabsTrigger>
        </TabsList>

        <TabsContent value="departments">
          <Card className="p-4 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-medium">Department tree</h2>
                <p className="text-sm text-muted-foreground">Active and inactive departments with hierarchy context.</p>
              </div>
              <Button
                variant="outline"
                disabled={createDepartmentMutation.isPending}
                onClick={() => createDepartmentMutation.mutate()}
              >
                {createDepartmentMutation.isPending ? "Saving…" : "Create department"}
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="dept-name">Name</Label>
                <Input
                  id="dept-name"
                  value={departmentForm.name}
                  onChange={(event) => setDepartmentForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dept-code">Code</Label>
                <Input
                  id="dept-code"
                  value={departmentForm.code}
                  onChange={(event) => setDepartmentForm((current) => ({ ...current, code: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dept-head">Head</Label>
                <Select
                  value={departmentForm.head_user_id}
                  onValueChange={(value) => setDepartmentForm((current) => ({ ...current, head_user_id: value }))}
                >
                  <SelectTrigger id="dept-head"><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {employeeOptions.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dept-parent">Parent department</Label>
                <Select
                  value={departmentForm.parent_department_id}
                  onValueChange={(value) => setDepartmentForm((current) => ({ ...current, parent_department_id: value }))}
                >
                  <SelectTrigger id="dept-parent"><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <div className="space-y-2">
                <Label htmlFor="dept-status">Status</Label>
                <Select
                  value={departmentForm.status}
                  onValueChange={(value) => setDepartmentForm((current) => ({ ...current, status: value as "active" | "inactive" }))}
                >
                  <SelectTrigger id="dept-status"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {departmentsQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : departmentsQuery.data?.length ? (
              <div className="space-y-2">
                {departmentsQuery.data.map((department) => (
                  <div key={department.id} className="flex items-center justify-between rounded-md border border-border/70 px-4 py-3">
                    <div>
                      <div className="font-medium">{department.name}</div>
                      <div className="text-xs text-muted-foreground">Code: {department.code}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={department.status === "active" ? "default" : "secondary"}>
                        {department.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={departmentStatusMutation.isPending}
                        onClick={() => departmentStatusMutation.mutate({
                          id: department.id,
                          status: department.status === "active" ? "inactive" : "active",
                        })}
                      >
                        {department.status === "active" ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No departments found.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card className="p-4 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-medium">Asset categories</h2>
                <p className="text-sm text-muted-foreground">Custom field schemas for future asset registration.</p>
              </div>
              <Button
                variant="outline"
                disabled={createCategoryMutation.isPending}
                onClick={() => createCategoryMutation.mutate()}
              >
                {createCategoryMutation.isPending ? "Saving…" : "Add category"}
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="category-name">Category name</Label>
                <Input
                  id="category-name"
                  value={categoryForm.name}
                  onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-status">Status</Label>
                <Select
                  value={categoryForm.status}
                  onValueChange={(value) => setCategoryForm((current) => ({ ...current, status: value as "active" | "inactive" }))}
                >
                  <SelectTrigger id="category-status"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 rounded-md border border-border/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Custom fields</h3>
                  <p className="text-xs text-muted-foreground">Define the schema that will drive asset registration inputs.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCategoryForm((current) => ({
                    ...current,
                    customFields: [...current.customFields, { name: "", type: "text" }],
                  }))}
                >
                  Add field
                </Button>
              </div>

              <div className="space-y-3">
                {categoryForm.customFields.map((field, index) => (
                  <div key={`${index}-${field.type}`} className="grid gap-3 md:grid-cols-[1fr_180px_120px]">
                    <Input
                      placeholder="Field name"
                      value={field.name}
                      onChange={(event) => setCategoryForm((current) => {
                        const next = [...current.customFields];
                        next[index] = { ...next[index], name: event.target.value };
                        return { ...current, customFields: next };
                      })}
                    />
                    <Select
                      value={field.type}
                      onValueChange={(value) => setCategoryForm((current) => {
                        const next = [...current.customFields];
                        next[index] = { ...next[index], type: value as AssetCustomFieldDefinition["type"] };
                        return { ...current, customFields: next };
                      })}
                    >
                      <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={categoryForm.customFields.length === 1}
                      onClick={() => setCategoryForm((current) => ({
                        ...current,
                        customFields: current.customFields.filter((_, fieldIndex) => fieldIndex !== index),
                      }))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {categoriesQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : categoriesQuery.data?.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {categoriesQuery.data.map((category) => (
                  <div key={category.id} className="rounded-md border border-border/70 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{category.name}</div>
                      <Badge variant={category.status === "active" ? "default" : "secondary"}>
                        {category.status}
                      </Badge>
                    </div>
                    <pre className="mt-3 overflow-auto rounded bg-muted/30 p-3 text-xs text-muted-foreground">
                      {JSON.stringify(category.custom_fields ?? [], null, 2)}
                    </pre>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={categoryStatusMutation.isPending}
                        onClick={() => categoryStatusMutation.mutate({
                          id: category.id,
                          status: category.status === "active" ? "inactive" : "active",
                        })}
                      >
                        {category.status === "active" ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No categories found.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="employees">
          <Card className="p-4 space-y-4">
            <div>
              <h2 className="font-medium">Employee directory</h2>
              <p className="text-sm text-muted-foreground">Promote or revert roles from the one allowed admin flow.</p>
            </div>

            {employeesQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : employeesQuery.data?.length ? (
              <div className="space-y-2">
                {employeesQuery.data.map((employee) => {
                  const primaryRole = (employee.roles[0] ?? "employee") as RoleValue;
                  return (
                    <div key={employee.id} className="flex flex-col gap-3 rounded-md border border-border/70 p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-xs text-muted-foreground">{employee.email}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="secondary">{roleLabel[primaryRole]}</Badge>
                          <Badge variant={employee.status === "active" ? "default" : "secondary"}>{employee.status}</Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => promoteMutation.mutate({ userId: employee.id, role: "department_head" })} disabled={promoteMutation.isPending}>
                          Promote to Department Head
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => promoteMutation.mutate({ userId: employee.id, role: "asset_manager" })} disabled={promoteMutation.isPending}>
                          Promote to Asset Manager
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => promoteMutation.mutate({ userId: employee.id, role: "employee" })} disabled={promoteMutation.isPending}>
                          Revert to Employee
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No employees found.</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
