import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: items, error } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", params.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(items);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, track, description, unit_price } = body;

    // Validate
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (track !== 'A' && track !== 'B') {
      return NextResponse.json({ error: "Track must be 'A' or 'B'" }, { status: 400 });
    }

    // Verify parent order exists and is not deleted
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id")
      .eq("id", params.id)
      .is("deleted_at", null)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Parent order not found or deleted" }, { status: 404 });
    }

    // Insert new item
    const { data: newItem, error: insertError } = await supabase
      .from("order_items")
      .insert([{
        order_id: params.id,
        name: name.trim(),
        track,
        description: description || null,
        unit_price: unit_price || null,
        status: 'confirmed'
      }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(newItem, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
