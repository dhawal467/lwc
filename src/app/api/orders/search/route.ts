import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json([]);
  }

  // Search orders by number or customer name
  // Note: ILIKE on joined table columns requires a specific approach in Supabase/PostgREST
  // We use or() with foreign table syntax: 'order_number.ilike.%q%,customers(name).ilike.%q%'
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      customers!inner ( name ),
      order_items ( id, name, blocked )
    `)
    .or(`order_number.ilike.%${q}%,customers.name.ilike.%${q}%`)
    .is("deleted_at", null)
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = (data || []).map(o => ({
    id: o.id,
    order_number: o.order_number,
    customer_name: (o.customers as any)?.name || 'Unknown',
    items: o.order_items || []
  }));

  return NextResponse.json(results);
}
