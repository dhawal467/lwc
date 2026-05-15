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

  if (!q || !q.trim()) {
    return NextResponse.json([]);
  }

  const selectFields = `
    id,
    order_number,
    customers!inner ( name ),
    order_items ( id, name, blocked, deleted_at )
  `;

  // Run two queries in parallel: one by order_number, one by customer name.
  // PostgREST's or() with joined-column filters is unreliable, so we do this instead.
  const [byNumber, byCustomer] = await Promise.all([
    supabase
      .from("orders")
      .select(selectFields)
      .ilike("order_number", `%${q}%`)
      .is("deleted_at", null)
      .not("status", "eq", "completed")
      .limit(5),
    supabase
      .from("orders")
      .select(selectFields)
      .ilike("customers.name", `%${q}%`)
      .is("deleted_at", null)
      .not("status", "eq", "completed")
      .limit(5),
  ]);

  if (byNumber.error) {
    return NextResponse.json({ error: byNumber.error.message }, { status: 500 });
  }
  if (byCustomer.error) {
    return NextResponse.json({ error: byCustomer.error.message }, { status: 500 });
  }

  // Merge and deduplicate by id, cap at 8 results
  const seen = new Set<string>();
  const merged = [...(byNumber.data || []), ...(byCustomer.data || [])].filter(o => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  }).slice(0, 8);

  const results = merged.map(o => ({
    id: o.id,
    order_number: o.order_number,
    customer_name: (o.customers as any)?.name || "Unknown",
    items: (o.order_items || []).filter((item: any) => !item.deleted_at),
  }));

  return NextResponse.json(results);
}
