/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { calculatePayroll, getMonthDateRange } from "@/lib/payroll";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check role: admin or manager (allow app_metadata, user_metadata, or users table)
  let userRole = user.app_metadata?.role || user.user_metadata?.role;
  if (userRole !== "admin" && userRole !== "manager") {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role) {
      userRole = profile.role;
    }
  }

  if (userRole !== "admin" && userRole !== "manager") {
    return NextResponse.json(
      { error: "Forbidden: Admin or Manager access required" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");
  const { month, startDate, endDate } = getMonthDateRange(monthParam);

  try {
    // 1. Fetch active workers
    const { data: workers, error: workersError } = await supabase
      .from("workers")
      .select("*")
      .or("active.eq.true,active.is.null")
      .order("name", { ascending: true });

    if (workersError) {
      return NextResponse.json({ error: workersError.message }, { status: 500 });
    }

    // 2. Fetch attendance for date range
    const { data: attendance, error: attendanceError } = await supabase
      .from("attendance")
      .select("worker_id, shifts_worked, status, date")
      .gte("date", startDate)
      .lte("date", endDate);

    if (attendanceError) {
      return NextResponse.json({ error: attendanceError.message }, { status: 500 });
    }

    // 3. Fetch advances for date range
    const { data: advances, error: advancesError } = await supabase
      .from("worker_advances")
      .select("worker_id, amount, date")
      .gte("date", startDate)
      .lte("date", endDate);

    if (advancesError) {
      return NextResponse.json({ error: advancesError.message }, { status: 500 });
    }

    // 4. Calculate Payroll
    const payrollResult = calculatePayroll(
      workers || [],
      attendance || [],
      advances || [],
      month
    );

    return NextResponse.json(payrollResult);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to calculate payroll" },
      { status: 500 }
    );
  }
}
