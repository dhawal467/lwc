import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  let query = supabase.from("attendance").select("*");
  if (startDate) query = query.gte("date", startDate);
  if (endDate) query = query.lte("date", endDate);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { worker_id, date, status, shifts_worked } = await req.json();

  // Derive status from shifts_worked if provided, for backward compatibility
  const resolvedStatus = status ?? (shifts_worked > 0 ? "present" : "absent");
  const resolvedShifts = shifts_worked ?? (status === "present" ? 1.0 : 0);

  // Upsert attendance
  const { data, error } = await supabase
    .from("attendance")
    .upsert(
      { worker_id, date, status: resolvedStatus, shifts_worked: resolvedShifts },
      { onConflict: "worker_id,date" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
