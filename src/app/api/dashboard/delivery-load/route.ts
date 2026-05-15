import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { startOfWeek, endOfWeek, addWeeks, format, isWithinInterval, parseISO } from "date-fns";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const startDate = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const endDate = endOfWeek(addWeeks(startDate, 7), { weekStartsOn: 1 });

  // Query 1: Upcoming 8 weeks
  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      delivery_date,
      status,
      customers ( name ),
      owner:users!owner_id ( full_name ),
      order_items ( id )
    `)
    .is("deleted_at", null)
    .not("status", "in", "(completed,dispatched,cancelled)")
    .gte("delivery_date", format(startDate, "yyyy-MM-dd"))
    .lte("delivery_date", format(endDate, "yyyy-MM-dd"))
    .order("delivery_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Query 2: Backlog — delivery_date is in the past, not completed/dispatched/cancelled
  const { data: backlogRaw, error: backlogError } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      delivery_date,
      status,
      customers ( name ),
      owner:users!owner_id ( full_name ),
      order_items ( id )
    `)
    .is("deleted_at", null)
    .not("status", "in", "(completed,dispatched,cancelled)")
    .lt("delivery_date", todayStr)
    .order("delivery_date", { ascending: true }); // oldest first = most overdue

  if (backlogError) {
    return NextResponse.json({ error: backlogError.message }, { status: 500 });
  }

  const mapOrder = (o: any) => ({
    id: o.id,
    order_number: o.order_number,
    customer_name: (o.customers as any)?.name || "Unknown",
    item_count: o.order_items?.length || 0,
    status: o.status,
    owner_name: (o.owner as any)?.full_name || "Unassigned",
    delivery_date: o.delivery_date,
  });

  // Group upcoming orders by week
  const weeks = [];
  for (let i = 0; i < 8; i++) {
    const weekStart = addWeeks(startDate, i);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    const weekOrders = (orders || [])
      .filter(o => {
        if (!o.delivery_date) return false;
        try {
          const d = parseISO(o.delivery_date);
          if (isNaN(d.getTime())) return false;
          return isWithinInterval(d, { start: weekStart, end: weekEnd });
        } catch {
          return false;
        }
      })
      .map(mapOrder);

    weeks.push({
      weekStart: format(weekStart, "yyyy-MM-dd"),
      weekEnd: format(weekEnd, "yyyy-MM-dd"),
      orders: weekOrders,
    });
  }

  const backlog = (backlogRaw || []).map(mapOrder);

  return NextResponse.json({ weeks, backlog });
}
