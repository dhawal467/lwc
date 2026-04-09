import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();

    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        *,
        customers ( name ),
        order_stages ( * )
      `)
      .in("status", ["in_production", "on_hold", "dispatched"]);

    if (error) {
      console.error("[Kanban API] Error fetching orders:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group orders by their current stage
    const groupedOrders: Record<string, any[]> = {};

    orders?.forEach((order) => {
      // Find the currently active stage
      const currentStage = order.order_stages?.find(
        (s: any) => s.status === "in_progress"
      );

      if (currentStage?.stage_key) {
        if (!groupedOrders[currentStage.stage_key]) {
          groupedOrders[currentStage.stage_key] = [];
        }
        // Attach the current stage explicitly to make life easier for frontend
        groupedOrders[currentStage.stage_key].push({
          ...order,
          currentStage,
        });
      }
    });

    return NextResponse.json(groupedOrders);
  } catch (error) {
    console.error("[Kanban API] Internal error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
