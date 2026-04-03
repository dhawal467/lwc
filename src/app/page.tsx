"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [customers, setCustomers] = useState<any[] | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase.from("customers").select("*");
      if (error) {
        console.error("Error fetching customers:", error);
      } else {
        setCustomers(data);
      }
    };

    fetchCustomers();
  }, [supabase]);

  return (
    <main className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-display font-bold text-text-primary">
          Sprint 0 Playground
        </h1>

        <Card>
          <CardHeader>
            <CardTitle>UI Primitives: Warm Soft Pop</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Buttons Section */}
            <div className="space-y-3">
              <h3 className="text-xl font-body font-semibold text-text-secondary">
                Buttons
              </h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="default">Primary Button</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
              </div>
            </div>

            {/* Input Section */}
            <div className="space-y-3">
              <h3 className="text-xl font-body font-semibold text-text-secondary">
                Input
              </h3>
              <Input placeholder="Enter something warm..." />
            </div>

            {/* Badges Section */}
            <div className="space-y-3">
              <h3 className="text-xl font-body font-semibold text-text-secondary">
                Badges
              </h3>
              <div className="flex gap-4">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Verification Section */}
        <Card>
          <CardHeader>
            <CardTitle>Database Health: Seeded Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-surface-raised rounded-md border border-border">
              <pre className="text-xs font-mono text-text-secondary overflow-auto max-h-60">
                {customers
                  ? JSON.stringify(customers, null, 2)
                  : "Fetching customers..."}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
