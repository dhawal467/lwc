"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      const rawReturnUrl = searchParams.get("returnUrl");
      let safeReturnUrl = "/dashboard";
      if (
        rawReturnUrl &&
        rawReturnUrl.startsWith("/") &&
        !rawReturnUrl.startsWith("//")
      ) {
        safeReturnUrl = rawReturnUrl;
      }

      router.refresh();
      router.push(safeReturnUrl);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-sm border border-border bg-surface">
      <CardHeader className="space-y-2 pb-6">
        <CardTitle className="text-3xl font-display font-bold text-center text-text-primary">
          FurnitureMFG
        </CardTitle>
        <p className="text-center text-text-secondary font-body text-sm">
          Manager Access
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <Input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="text-base sm:text-sm"
            />
          </div>
          <div className="space-y-1">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="text-base sm:text-sm"
            />
          </div>

          {error && (
            <div className="text-danger bg-danger-soft p-3 rounded-md text-sm font-medium border border-danger/20">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="default"
            className="w-full min-h-[44px] text-base font-semibold active:scale-[0.98]"
            disabled={loading}
          >
            {loading ? "Authenticating..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md p-8 border border-border rounded-xl bg-surface animate-pulse text-center text-text-muted">
            Loading sign in...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
