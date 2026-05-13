import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { startOfWeek, endOfWeek, addWeeks, format, isWithinInterval, parseISO } from "date-fns";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Calculate range: 8 weeks starting from last Monday
  const today = new Date();
  const startDate = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const endDate = endOfWeek(addWeeks(startDate, 7), { weekStartsOn: 1 });

  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      delivery_date,
      status,
      customers ( name ),
      owner:users!orders_owner_id_fkey ( full_name ),
      order_items ( id )
    `)
    .is("deleted_at", null)
    .not("status", "eq", "completed")
    .gte("delivery_date", format(startDate, "yyyy-MM-dd"))
    .lte("delivery_date", format(endDate, "yyyy-MM-dd"))
    .order("delivery_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by week
  const weeks = [];
  for (let i = 0; i < 8; i++) {
    const weekStart = addWeeks(startDate, i);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    
    const weekOrders = (orders || [])
      .filter(o => o.delivery_date && isWithinInterval(parseISO(o.delivery_date), { start: weekStart, end: weekEnd }))
      .map(o => ({
        id: o.id,
        order_number: o.order_number,
        customer_name: (o.customers as any)?.name || 'Unknown',
        item_count: o.order_items?.length || 0,
        status: o.status,
        owner_name: (o.owner as any)?.full_name || 'Unassigned'
      }));

    weeks.push({
      weekStart: format(weekStart, "yyyy-MM-dd"),
      weekEnd: format(weekEnd, "yyyy-MM-dd"),
      orders: weekOrders
    });
  }

  return NextResponse.json({ weeks });
}
