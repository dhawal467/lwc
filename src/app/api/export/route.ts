import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure user is admin (optional, depending on requirements, but let's just do a basic check)
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch all orders with customers
  const { data: orders, error } = await supabase
    .from('orders')
    .select('order_number, status, quoted_amount, created_at, customers (name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error || !orders) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }

  // Generate CSV
  const header = 'Order No,Customer,Status,Amount,Date\n';
  const csvData = orders.map((order: any) => {
    const customerName = order.customers ? `"${order.customers.name}"` : 'Unknown';
    const date = new Date(order.created_at).toLocaleDateString();
    return `${order.order_number},${customerName},${order.status},${order.quoted_amount || 0},${date}`;
  }).join('\n');

  const csvContent = header + csvData;

  const response = new NextResponse(csvContent);
  response.headers.set('Content-Type', 'text/csv');
  response.headers.set('Content-Disposition', 'attachment; filename=orders.csv');

  return response;
}
