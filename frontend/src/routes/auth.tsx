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
  head: () => ({ meta: [{ title: "Sign in - Sampada" }] }),
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
        toast.success("Account created - you're signed in");
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
      {/* Left Pane: Premium Dark Mode with Glows and Glassmorphism */}
      <div className="hidden lg:flex flex-col p-12 relative overflow-hidden bg-zinc-950 text-white">
        {/* Animated glowing ambient background */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[100px] mix-blend-screen opacity-50 animate-pulse" style={{ animationDuration: '6s' }} />

        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

        <div className="flex items-center gap-2 relative z-10 text-primary">
          <Boxes className="h-6 w-6" />
          <span className="text-xl font-bold tracking-tight text-white">Sampada</span>
        </div>

        <div className="relative z-10 space-y-6 w-full pr-8 mt-16 mb-auto">
          <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/50 leading-tight">
            Manage your workspace effortlessly.
          </h1>
          <p className="text-white/60 text-lg leading-relaxed">
            Streamline your assets, track resources, and keep everything organized in one incredibly secure platform.
          </p>

          {/* Subtle Glassmorphic Stats Row */}
          <div className="flex gap-4 pt-4">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
              <div className="text-3xl font-bold text-white mb-1">99.9%</div>
              <div className="text-sm text-white/50">Uptime SLA</div>
            </div>
            <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
              <div className="text-3xl font-bold text-white mb-1">24/7</div>
              <div className="text-sm text-white/50">Audit Trails</div>
            </div>
          </div>
        </div>

        <p className="text-sm font-medium text-white/40 relative z-10">© 2026 Sampada ERP</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-6">
          <div className="lg:hidden flex items-center gap-2 text-primary mb-4">
            <Boxes className="h-5 w-5" /><span className="font-semibold">Sampada</span>
          </div>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-1.5"><Label htmlFor="li-email">Email</Label>
                  <Input id="li-email" name="email" type="email" required autoComplete="email" placeholder="Enter your email" className="placeholder:text-primary/70 placeholder:font-semibold focus:placeholder-transparent transition-all" /></div>
                <div className="space-y-1.5"><Label htmlFor="li-password">Password</Label>
                  <Input id="li-password" name="password" type="password" required autoComplete="current-password" placeholder="Enter your password" className="placeholder:text-primary/70 placeholder:font-semibold focus:placeholder-transparent transition-all" /></div>
                <Button className="w-full transition-all active:scale-[0.98]" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div className="space-y-1.5"><Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" name="name" required placeholder="John Doe" className="placeholder:text-primary/70 placeholder:font-semibold focus:placeholder-transparent transition-all" /></div>
                <div className="space-y-1.5"><Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" name="email" type="email" required placeholder="john@example.com" className="placeholder:text-primary/70 placeholder:font-semibold focus:placeholder-transparent transition-all" /></div>
                <div className="space-y-1.5"><Label htmlFor="su-dept">Department</Label>
                  <Select name="department_id">
                    <SelectTrigger id="su-dept"><SelectValue placeholder={departments.length ? "Select department" : "No departments yet, contact admin"} /></SelectTrigger>
                    <SelectContent>
                      {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label htmlFor="su-password">Password</Label>
                  <Input id="su-password" name="password" type="password" required minLength={8} placeholder="Create a password" className="placeholder:text-primary/70 placeholder:font-semibold focus:placeholder-transparent transition-all" /></div>
                <div className="space-y-1.5"><Label htmlFor="su-confirm">Confirm password</Label>
                  <Input id="su-confirm" name="confirm" type="password" required minLength={8} placeholder="Confirm password" className="placeholder:text-primary/70 placeholder:font-semibold focus:placeholder-transparent transition-all" /></div>
                <p className="text-xs text-muted-foreground">
                  New accounts are created as <strong>Employees</strong>. Roles are elevated by an Admin.
                </p>
                <Button className="w-full transition-all active:scale-[0.98]" disabled={loading}>{loading ? "Creating…" : "Create account"}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
