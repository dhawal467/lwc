import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RecycleBinClient } from "./RecycleBinClient";

export default async function RecycleBinPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full pt-20 space-y-4">
        <h1 className="text-3xl font-display font-bold text-danger">Access Denied</h1>
        <p className="text-text-secondary">You do not have permission to view the Recycle Bin.</p>
      </div>
    );
  }

  // Fetch soft-deleted orders
  const { data: deletedOrders, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      deleted_at,
      customers ( name )
    `)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) {
    console.error("Error fetching deleted orders:", error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-text-primary">Recycle Bin</h1>
        <p className="text-text-secondary mt-1">Manage deleted orders.</p>
      </div>
      
      <RecycleBinClient initialOrders={deletedOrders || []} />
    </div>
  );
}
