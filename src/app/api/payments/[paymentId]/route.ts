import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: { paymentId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin role
  const role = user.app_metadata?.role;

  if (role !== 'admin') {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const { error } = await supabase
    .from("payment_ledger")
    .delete()
    .eq("id", params.paymentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
