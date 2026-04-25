import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, LogOut, Moon } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Manage your account and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card className="shadow-sm border border-border">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-text-secondary">Full Name</p>
              <p className="font-medium text-text-primary">{profile?.name || "No name provided"}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Email Address</p>
              <p className="font-medium text-text-primary">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Account Role</p>
              <div className="mt-1">
                <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-secondary/20 text-secondary-hover uppercase">
                  {profile?.role || "Manager"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Card */}
        <Card className="shadow-sm border border-border">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Moon className="w-5 h-5 text-primary" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text-primary">Dark Mode</p>
                <p className="text-sm text-text-secondary">Toggle application theme</p>
              </div>
              <ThemeToggle />
            </div>

            <div className="pt-4 border-t border-border">
              <form action="/auth/signout" method="POST">
                <Button variant="danger" className="w-full flex items-center justify-center gap-2">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
