import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Boxes } from "lucide-react";
import { getAuthSession, listActiveDepartments, signInWithPassword, signUpWithPassword } from "@/lib/backend/app-backend";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — AssetFlow" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    getAuthSession().then((session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    listActiveDepartments().then(setDepartments);
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await signInWithPassword(String(f.get("email")), String(f.get("password")));
      toast.success("Welcome back");
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    const confirm = String(f.get("confirm"));
    if (password !== confirm) return toast.error("Passwords do not match");
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setLoading(true);
    try {
      const session = await signUpWithPassword({
        email: String(f.get("email")),
        password,
        name: String(f.get("name")),
        department_id: String(f.get("department_id") ?? ""),
        emailRedirectTo: `${window.location.origin}/dashboard`,
      });
      if (session) {
        toast.success("Account created — you're signed in");
        navigate({ to: "/dashboard", replace: true });
      } else {
        toast.success("Account created. Check your email to confirm sign in if required.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar border-r border-sidebar-border">
        <div className="flex items-center gap-2 text-primary">
          <Boxes className="h-6 w-6" />
          <span className="text-lg font-semibold tracking-tight">AssetFlow</span>
        </div>
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">
            Every asset, allocation, and audit — in one place.
          </h1>
          <p className="mt-4 text-muted-foreground max-w-md">
            Register assets, allocate them to teams, book shared resources, and run
            organization-wide audits with full activity trails.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© AssetFlow ERP</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-6">
          <div className="lg:hidden flex items-center gap-2 text-primary mb-4">
            <Boxes className="h-5 w-5" /><span className="font-semibold">AssetFlow</span>
          </div>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div><Label htmlFor="li-email">Email</Label>
                  <Input id="li-email" name="email" type="email" required autoComplete="email" /></div>
                <div><Label htmlFor="li-password">Password</Label>
                  <Input id="li-password" name="password" type="password" required autoComplete="current-password" /></div>
                <Button className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div><Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" name="name" required /></div>
                <div><Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" name="email" type="email" required /></div>
                <div><Label htmlFor="su-dept">Department</Label>
                  <Select name="department_id">
                    <SelectTrigger id="su-dept"><SelectValue placeholder={departments.length ? "Select department" : "No departments yet — ask admin"} /></SelectTrigger>
                    <SelectContent>
                      {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label htmlFor="su-password">Password</Label>
                  <Input id="su-password" name="password" type="password" required minLength={8} /></div>
                <div><Label htmlFor="su-confirm">Confirm password</Label>
                  <Input id="su-confirm" name="confirm" type="password" required minLength={8} /></div>
                <p className="text-xs text-muted-foreground">
                  New accounts are created as <strong>Employees</strong>. Roles are elevated by an Admin.
                </p>
                <Button className="w-full" disabled={loading}>{loading ? "Creating…" : "Create account"}</Button>
              </form>
            </TabsContent>
          </Tabs>
          <div className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground">Back to app</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
