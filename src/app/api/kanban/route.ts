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
        order_stages ( * ),
        design_files ( file_url, uploaded_at )
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
        order_stages ( *, qc_checks ( photo_url, passed ) ),
        orders (
          id,
          order_number,
          customer_id,
          priority,
          delivery_date,
          customers ( name ),
          design_files ( file_url, uploaded_at )
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
      let currentStage = order.order_stages?.find(
        (s: any) => s.status === "in_progress"
      );

      // Fallback: if no in_progress stage row exists, synthesise one from orders.current_stage_key
      if (!currentStage && order.current_stage_key) {
        currentStage = {
          stage_key: order.current_stage_key,
          status: "in_progress",
          started_at: order.created_at,
          sanding_complete: false,
          notes: null,
          photo_url: null,
        };
      }

      if (currentStage?.stage_key) {
        if (!groupedOrders[currentStage.stage_key]) {
          groupedOrders[currentStage.stage_key] = [];
        }
        const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
        
        // Resolve thumbnail
        let thumbnail_url = null;
        if (order.design_files && order.design_files.length > 0) {
          thumbnail_url = order.design_files[0].file_url;
        }

        groupedOrders[currentStage.stage_key].push({
          ...order,
          customers: customer,
          currentStage,
          type: "order" as const,
          thumbnail_url,
          quantity: 1, // Phase 1 orders are typically single item
        });
      }
    });

    // Process Phase 2 item-level cards
    (phase2Items || []).forEach((item) => {
      let currentStage = item.order_stages?.find(
        (s: any) => s.status === "in_progress"
      );

      // Fallback: synthesise stage from item.current_stage_key if no FSM row exists
      if (!currentStage && item.current_stage_key) {
        currentStage = {
          stage_key: item.current_stage_key,
          status: "in_progress",
          started_at: item.created_at,
          sanding_complete: false,
          notes: null,
          photo_url: null,
          qc_checks: [],
        };
      }

      if (currentStage?.stage_key) {
        if (!groupedOrders[currentStage.stage_key]) {
          groupedOrders[currentStage.stage_key] = [];
        }

        const parentOrder = item.orders as any;
        const parentCustomer = Array.isArray(parentOrder?.customers)
          ? parentOrder.customers[0]
          : parentOrder?.customers;

        // Resolve thumbnail
        let thumbnail_url = null;
        if (currentStage.stage_key === 'qc_check' && currentStage.qc_checks && currentStage.qc_checks.length > 0) {
          thumbnail_url = currentStage.qc_checks[0].photo_url;
        } else if (parentOrder?.design_files && parentOrder.design_files.length > 0) {
          thumbnail_url = parentOrder.design_files[0].file_url;
        }

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
          quantity: item.quantity,
          order_stages: item.order_stages,
          currentStage,
          type: "item" as const,
          thumbnail_url,
        });
      }
    });

    return NextResponse.json(groupedOrders);
  } catch (error) {
    console.error("[Kanban API] Internal error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
