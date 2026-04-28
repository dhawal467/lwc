import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = user.app_metadata?.role;
  if (role !== 'admin') {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const minBalanceStr = searchParams.get('min_balance');
    const sort = searchParams.get('sort');

    // Query order_financials view and join with customers
    let query = supabase
      .from('order_financials')
      .select('*, customers(id, name, phone)');

    if (minBalanceStr) {
      const minBalance = parseFloat(minBalanceStr);
      if (!isNaN(minBalance)) {
        query = query.gte('balance_due', minBalance);
      }
    }

    if (sort === 'balance_desc') {
      query = query.order('balance_due', { ascending: false });
    }

    const { data: financials, error } = await query;

    if (error) {
      throw error;
    }

    // Group by customer
    const customersMap = new Map<string, any>();
    let grandTotalOutstanding = 0;
    let totalOrders = 0;

    for (const row of financials || []) {
      const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
      if (!customer) continue;

      const customerId = customer.id;
      if (!customersMap.has(customerId)) {
        customersMap.set(customerId, {
          customer_id: customerId,
          customer_name: customer.name,
          customer_phone: customer.phone,
          total_quoted: 0,
          total_paid: 0,
          total_balance: 0,
          orders: []
        });
      }

      const customerGroup = customersMap.get(customerId);
      customerGroup.total_quoted += Number(row.quoted_amount || 0);
      customerGroup.total_paid += Number(row.total_paid || 0);
      customerGroup.total_balance += Number(row.balance_due || 0);
      
      // Clean up the order object
      const { customers: _, ...orderData } = row;
      customerGroup.orders.push(orderData);

      grandTotalOutstanding += Number(row.balance_due || 0);
      totalOrders += 1;
    }

    const customers = Array.from(customersMap.values());

    // If sorting by balance_desc, we should probably sort the customers array too
    if (sort === 'balance_desc') {
      customers.sort((a, b) => b.total_balance - a.total_balance);
    }

    return NextResponse.json({
      customers,
      grand_total_outstanding: grandTotalOutstanding,
      total_orders: totalOrders
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
