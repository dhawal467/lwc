import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function getPaymentSummary(supabase: any, orderId: string) {
  const { data: order } = await supabase
    .from("orders")
    .select("quoted_amount")
    .eq("id", orderId)
    .single();

  const { data: payments } = await supabase
    .from("payment_ledger")
    .select("amount")
    .eq("order_id", orderId);

  const quotedAmount = order?.quoted_amount || 0;
  const totalPaid = payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
  const balanceDue = quotedAmount - totalPaid;

  return {
    quoted_amount: quotedAmount,
    total_paid: totalPaid,
    balance_due: balanceDue
  };
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: payments, error } = await supabase
    .from("payment_ledger")
    .select("*")
    .eq("order_id", params.id)
    .order("payment_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const summary = await getPaymentSummary(supabase, params.id);

  return NextResponse.json({
    payments,
    summary
  });
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
    const { amount, payment_type, payment_date, notes } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    if (!['advance', 'partial', 'final'].includes(payment_type)) {
      return NextResponse.json({ error: "Invalid payment type" }, { status: 400 });
    }

    const { data: newPayment, error: insertError } = await supabase
      .from("payment_ledger")
      .insert([{
        order_id: params.id,
        amount,
        payment_type,
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        notes: notes || null,
        recorded_by: user.id
      }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const summary = await getPaymentSummary(supabase, params.id);

    return NextResponse.json({
      payment: newPayment,
      summary
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
