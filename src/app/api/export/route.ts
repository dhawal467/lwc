import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const today = new Date().toISOString().split('T')[0];

  if (type === 'finance') {
    // Finance Export
    const { data: financials, error } = await supabase
      .from('order_financials')
      .select('*, customers (name, phone)')
      .order('customer_id');

    if (error || !financials) {
      console.error('Finance export error:', error);
      return NextResponse.json({ error: 'Failed to fetch financial data' }, { status: 500 });
    }

    const header = 'Customer Name,Customer Phone,Order Number,Status,Quoted Amount,Total Paid,Balance Due,Delivery Date\n';
    const csvData = financials.map((row: any) => {
      const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
      const customerName = customer?.name ? `"${customer.name}"` : 'Unknown';
      const phone = customer?.phone ? `"${customer.phone}"` : '';
      const deliveryDate = row.delivery_date ? new Date(row.delivery_date).toLocaleDateString() : '';
      
      return `${customerName},${phone},${row.order_number},${row.status},${row.quoted_amount || 0},${row.total_paid || 0},${row.balance_due || 0},${deliveryDate}`;
    }).join('\n');

    const csvContent = header + csvData;
    const response = new NextResponse(csvContent);
    response.headers.set('Content-Type', 'text/csv');
    response.headers.set('Content-Disposition', `attachment; filename="finance_report_${today}.csv"`);
    return response;

  } else {
    // Default Order Export
    const { data: orders, error } = await supabase
      .from('orders')
      .select('order_number, status, quoted_amount, created_at, customers (name)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error || !orders) {
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    const header = 'Order No,Customer,Status,Amount,Date\n';
    const csvData = orders.map((order: any) => {
      const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
      const customerName = customer ? `"${customer.name}"` : 'Unknown';
      const date = new Date(order.created_at).toLocaleDateString();
      return `${order.order_number},${customerName},${order.status},${order.quoted_amount || 0},${date}`;
    }).join('\n');

    const csvContent = header + csvData;
    const response = new NextResponse(csvContent);
    response.headers.set('Content-Type', 'text/csv');
    response.headers.set('Content-Disposition', `attachment; filename="orders_${today}.csv"`);
    return response;
  }
}
