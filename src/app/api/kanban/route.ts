import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();

    // Phase 1: Fetch orders with a global track (legacy orders)
    const { data: phase1Orders, error: phase1Error } = await supabase
      .from("orders")
      .select(`
        *,
        customers ( name ),
        order_stages ( * )
      `)
      .not("track", "is", null)
      .in("status", ["in_production", "on_hold", "dispatched"])
      .is("deleted_at", null);

    if (phase1Error) {
      console.error("[Kanban API] Error fetching Phase 1 orders:", phase1Error);
      return NextResponse.json({ error: phase1Error.message }, { status: 500 });
    }

    // Phase 2: Fetch order_items that are in active production
    const { data: phase2Items, error: phase2Error } = await supabase
      .from("order_items")
      .select(`
        *,
        order_stages ( * ),
        orders (
          id,
          order_number,
          customer_id,
          priority,
          delivery_date,
          customers ( name )
        )
      `)
      .in("status", ["in_production", "on_hold"])
      .is("deleted_at", null);

    if (phase2Error) {
      console.error("[Kanban API] Error fetching Phase 2 items:", phase2Error);
      return NextResponse.json({ error: phase2Error.message }, { status: 500 });
    }

    // Group all cards by their current active stage_key
    const groupedOrders: Record<string, any[]> = {};

    // Process Phase 1 orders
    (phase1Orders || []).forEach((order) => {
      const currentStage = order.order_stages?.find(
        (s: any) => s.status === "in_progress"
      );

      if (currentStage?.stage_key) {
        if (!groupedOrders[currentStage.stage_key]) {
          groupedOrders[currentStage.stage_key] = [];
        }
        groupedOrders[currentStage.stage_key].push({
          ...order,
          currentStage,
          type: "order" as const,
        });
      }
    });

    // Process Phase 2 item-level cards
    (phase2Items || []).forEach((item) => {
      const currentStage = item.order_stages?.find(
        (s: any) => s.status === "in_progress"
      );

      if (currentStage?.stage_key) {
        if (!groupedOrders[currentStage.stage_key]) {
          groupedOrders[currentStage.stage_key] = [];
        }

        const parentOrder = item.orders as any;
        const parentCustomer = Array.isArray(parentOrder?.customers)
          ? parentOrder.customers[0]
          : parentOrder?.customers;

        groupedOrders[currentStage.stage_key].push({
          // Parent order info for display
          id: parentOrder?.id,
          order_number: parentOrder?.order_number,
          priority: parentOrder?.priority,
          delivery_date: parentOrder?.delivery_date,
          customers: parentCustomer,
          // Item-specific fields
          item_id: item.id,
          item_name: item.name,
          track: item.track,
          status: item.status,
          order_stages: item.order_stages,
          currentStage,
          type: "item" as const,
        });
      }
    });

    return NextResponse.json(groupedOrders);
  } catch (error) {
    console.error("[Kanban API] Internal error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
