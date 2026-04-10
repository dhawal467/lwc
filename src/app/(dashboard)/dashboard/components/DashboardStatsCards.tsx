"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";

export function DashboardStatsCards() {
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-pop transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-secondary">Active Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-display font-bold text-text-primary">
            {isLoading ? '...' : stats?.activeOrders || 0}
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-danger shadow-sm hover:shadow-pop transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-secondary">Overdue Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-display font-bold text-danger">
            {isLoading ? '...' : stats?.overdueOrders || 0}
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-warning shadow-sm hover:shadow-pop transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-secondary">On Hold</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-display font-bold text-warning">
            0
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-success shadow-sm hover:shadow-pop transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-secondary">Outstanding (₹)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-mono font-bold text-success">
            {isLoading ? '...' : (stats?.totalOutstanding || 0).toLocaleString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
