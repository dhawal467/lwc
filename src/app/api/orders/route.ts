import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const customer_id = searchParams.get("customer_id");

  let query = supabase
    .from("orders")
    .select(`
      *,
      customers ( id, name, phone ),
      order_items ( id, name, status, track, current_stage_key ),
      payment_ledger ( amount )
    `)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (customer_id) {
    query = query.eq("customer_id", customer_id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Defensive: strip order_number if accidentally passed — DB function handles it
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { order_number: _omitted, ...payload } = body;

  const { data, error } = await supabase
    .from("orders")
    .insert({
      ...payload,
      status: payload.status ?? "confirmed",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
