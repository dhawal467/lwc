"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function RecycleBinClient({ initialOrders }: { initialOrders: any[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const supabase = createClient();
  const queryClient = useQueryClient();
  const router = useRouter();

  const handleRestore = async (id: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) throw error;
      
      setOrders(orders.filter(o => o.id !== id));
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['kanban'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      router.refresh();
      alert("Order restored successfully");
    } catch (error) {
      console.error("Restore failed:", error);
      alert("Failed to restore order.");
    }
  };

  const handleHardDelete = async (id: string) => {
    if (!confirm("Are you sure? This will permanently delete the order and all its related files. This action cannot be undone.")) return;

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setOrders(orders.filter(o => o.id !== id));
    } catch (error) {
      console.error("Hard delete failed:", error);
      alert("Failed to permanently delete order.");
    }
  };

  if (orders.length === 0) {
    return (
      <div className="bg-surface rounded-xl p-8 border border-border text-center text-text-secondary">
        The recycle bin is empty.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map(order => (
        <Card key={order.id} className="border border-border shadow-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="font-mono text-xs font-semibold text-danger bg-danger/10 px-2 py-1 rounded inline-block mb-2">
                {order.order_number}
              </div>
              <p className="font-medium text-text-primary">{order.customers?.name || "Unknown Customer"}</p>
              <p className="text-sm text-text-secondary mt-1">
                Deleted on: {new Date(order.deleted_at).toLocaleString()}
              </p>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="secondary" 
                size="sm" 
                className="w-full sm:w-auto text-success border-success/30 hover:bg-success/10 hover:text-success"
                onClick={() => handleRestore(order.id)}
              >
                Restore
              </Button>
              <Button 
                variant="danger" 
                size="sm" 
                className="w-full sm:w-auto"
                onClick={() => handleHardDelete(order.id)}
              >
                Delete Permanently
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
