/* eslint-disable @typescript-eslint/no-explicit-any */
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

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month"); // YYYY-MM
  
  const now = new Date();
  const monthStr = monthParam || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const [year, month] = monthStr.split('-').map(Number);
  const startDate = `${monthStr}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  // 1. Fetch Attendance
  const { data: attendance, error: attError } = await supabase
    .from("attendance")
    .select("*")
    .eq("worker_id", params.id)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (attError) {
    return NextResponse.json({ error: attError.message }, { status: 500 });
  }

  // 2. Fetch Advances
  const { data: advances, error: advError } = await supabase
    .from("worker_advances")
    .select("*")
    .eq("worker_id", params.id)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (advError) {
    return NextResponse.json({ error: advError.message }, { status: 500 });
  }

  // 3. Compute Summary
  const totalShifts = attendance?.reduce((sum, record) => sum + Number(record.shifts_worked || 0), 0) || 0;
  const totalAdvances = advances?.reduce((sum, record) => sum + Number(record.amount || 0), 0) || 0;

  return NextResponse.json({
    attendance: attendance || [],
    advances: advances || [],
    summary: {
      totalShifts,
      totalAdvances,
      month: monthStr
    }
  });
}
