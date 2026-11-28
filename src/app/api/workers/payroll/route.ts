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

    // 4. Fetch frozen historical settlements if any
    const { data: settlements, error: settlementsError } = await supabase
      .from("payroll_settlements")
      .select("*")
      .eq("month", month);

    if (settlementsError) {
      console.warn("payroll_settlements query warning:", settlementsError.message);
    }

    // 5. Calculate Payroll
    const payrollResult = calculatePayroll(
      workers || [],
      attendance || [],
      advances || [],
      month,
      settlements || []
    );

    return NextResponse.json(payrollResult);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to calculate payroll" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check role: admin or manager
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

  try {
    const body = await request.json();
    const nowIso = new Date().toISOString();

    if (body.settle_all && Array.isArray(body.records)) {
      const recordsToUpsert = body.records.map((r: any) => ({
        worker_id: r.worker_id,
        month: body.month,
        shifts_count: r.shifts_count,
        daily_rate: r.daily_rate,
        gross_wage: r.gross_wage,
        advances_deducted: r.advances_deducted,
        net_paid: r.net_paid,
        carryover_balance: r.carryover_balance || 0,
        settled_by: user.id,
        settled_at: nowIso,
        notes: r.notes || null,
      }));

      const { data, error } = await supabase
        .from("payroll_settlements")
        .upsert(recordsToUpsert, { onConflict: "worker_id,month" })
        .select("id");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, count: data?.length || recordsToUpsert.length });
    }

    if (!body.worker_id || !body.month) {
      return NextResponse.json(
        { error: "worker_id and month are required" },
        { status: 400 }
      );
    }

    const recordToUpsert = {
      worker_id: body.worker_id,
      month: body.month,
      shifts_count: body.shifts_count,
      daily_rate: body.daily_rate,
      gross_wage: body.gross_wage,
      advances_deducted: body.advances_deducted,
      net_paid: body.net_paid,
      carryover_balance: body.carryover_balance || 0,
      settled_by: user.id,
      settled_at: nowIso,
      notes: body.notes || null,
    };

    const { data, error } = await supabase
      .from("payroll_settlements")
      .upsert([recordToUpsert], { onConflict: "worker_id,month" })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, settlement: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to settle payroll" },
      { status: 500 }
    );
  }
}
