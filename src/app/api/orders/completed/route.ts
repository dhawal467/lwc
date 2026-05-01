/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get("page");
    const searchParam = searchParams.get("search");
    
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("orders")
      .select(`
        *,
        customers ( name ),
        order_items ( id, name, status )
      `, { count: "exact" })
      .in("status", ["completed", "cancelled"])
      .is("deleted_at", null);

    if (searchParam) {
      // Basic search on order_number. If we need to search customer name, 
      // Supabase's standard ilike doesn't easily span foreign tables in a single query 
      // without a view or custom RPC. For now, search by order number.
      query = query.ilike("order_number", `%${searchParam}%`);
    }

    const { data: orders, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    return NextResponse.json({ data: orders, count });
  } catch (error: any) {
    console.error("Error fetching completed orders:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
