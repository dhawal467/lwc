export const dynamic = 'force-dynamic';
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Columns } from "lucide-react";
import { DashboardStatsCards } from "./components/DashboardStatsCards";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let role = 'manager'; // fallback manager role
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile) {
      role = profile.role;
    }
  }

  const isAdmin = role === 'admin';
  const today = new Date().toISOString();

  // Fetch recent orders (top 5)
  const { data: recentOrders } = await supabase
    .from('orders')
    .select(`
      id, 
      order_number, 
      status, 
      created_at,
      customers ( name )
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5);

  // Fetch overdue orders (top 5)
  const { data: overdueOrders } = await supabase
    .from('orders')
    .select(`
      id, 
      order_number, 
      status, 
      delivery_date,
      customers ( name )
    `)
    .is('deleted_at', null)
    .lt('delivery_date', today)
    .neq('status', 'completed')
    .order('delivery_date', { ascending: true })
    .limit(5);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header section with Role-based Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-text-primary">Overview</h1>
          <p className="text-text-secondary font-body mt-1">Welcome back. Here is what is happening in the workshop.</p>
        </div>
        <div>
          {isAdmin ? (
            <Button variant="default" className="w-full sm:w-auto flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Download Full Financial Report
            </Button>
          ) : (
            <Link href="/dashboard/kanban">
              <Button variant="secondary" className="w-full sm:w-auto flex items-center justify-center gap-2">
                <Columns className="w-4 h-4" />
                View Production Board
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards Row using Client Component */}
      <DashboardStatsCards />

      {/* Lists Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Activity List */}
        <Card className="shadow-sm border border-border bg-surface">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-xl font-display text-danger">Overdue Orders</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              {overdueOrders && overdueOrders.length > 0 ? (
                overdueOrders.map((order) => {
                  const daysLate = Math.floor((new Date().getTime() - new Date(order.delivery_date).getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <Link
                      key={order.id}
                      href={`/dashboard/orders/${order.id}`}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-surface-raised px-2 -mx-2 transition-colors rounded-sm cursor-pointer group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                        <div className="font-mono text-xs font-semibold text-danger bg-danger/10 px-2 py-1 rounded inline-block w-fit transition-colors">
                          {order.order_number}
                        </div>
                        <div className="font-body font-medium text-text-primary text-sm sm:text-base">
                          {order.customers?.name || "Unknown"}
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm font-medium text-danger flex items-center gap-2">
                        <span>{daysLate} days late</span>
                      </div>
                    </Link>
                  )
                })
              ) : (
                <div className="py-8 text-center text-text-secondary text-sm">
                  No overdue orders!
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity List */}
        <Card className="shadow-sm border border-border bg-surface">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-xl font-display">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              {recentOrders && recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/dashboard/orders/${order.id}`}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-surface-raised px-2 -mx-2 transition-colors rounded-sm cursor-pointer group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <div className="font-mono text-xs font-semibold text-primary bg-primary-soft px-2 py-1 rounded inline-block w-fit group-hover:bg-primary group-hover:text-white transition-colors">
                        {order.order_number}
                      </div>
                      <div className="font-body font-medium text-text-primary text-sm sm:text-base">
                        {order.customers?.name || "Unknown"}
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-text-secondary flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                      <span className="capitalize">{order.status.replace('_', ' ')}</span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="py-8 text-center text-text-secondary text-sm">
                  No recent orders found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
