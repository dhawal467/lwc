import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const fieldsParam = searchParams.get('fields');
  
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

  // Parse which field sections are requested (default: all)
  const requestedFields = fieldsParam
    ? fieldsParam.split(',').map(f => f.trim())
    : ['order', 'customer', 'finance', 'production'];

  const includeOrder = requestedFields.includes('order');
  const includeCustomer = requestedFields.includes('customer');
  const includeFinance = requestedFields.includes('finance');
  const includeProduction = requestedFields.includes('production');

  if (type === 'finance') {
    // Finance Export — uses order_financials view
    const { data: financials, error } = await supabase
      .from('order_financials')
      .select('*, customers (name, phone)')
      .order('customer_id');

    if (error || !financials) {
      console.error('Finance export error:', error);
      return NextResponse.json({ error: 'Failed to fetch financial data' }, { status: 500 });
    }

    // Build dynamic header
    const headerParts: string[] = [];
    if (includeOrder) headerParts.push('Order Number', 'Status', 'Priority', 'Delivery Date');
    if (includeCustomer) headerParts.push('Customer Name', 'Customer Phone');
    if (includeFinance) headerParts.push('Quoted Amount', 'Total Paid', 'Balance Due');
    if (includeProduction) headerParts.push('Current Stage');

    const header = headerParts.join(',') + '\n';

    const csvData = financials.map((row: any) => {
      const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
      const parts: string[] = [];

      if (includeOrder) {
        parts.push(
          row.order_number || '',
          row.status || '',
          row.priority ? 'Yes' : 'No',
          row.delivery_date ? new Date(row.delivery_date).toLocaleDateString() : ''
        );
      }

      if (includeCustomer) {
        parts.push(
          customer?.name ? `"${customer.name}"` : 'Unknown',
          customer?.phone ? `"${customer.phone}"` : ''
        );
      }

      if (includeFinance) {
        parts.push(
          String(row.quoted_amount || 0),
          String(row.total_paid || 0),
          String(row.balance_due || 0)
        );
      }

      if (includeProduction) {
        parts.push(row.current_stage_key || 'N/A');
      }

      return parts.join(',');
    }).join('\n');

    const csvContent = header + csvData;
    const response = new NextResponse(csvContent);
    response.headers.set('Content-Type', 'text/csv');
    response.headers.set('Content-Disposition', `attachment; filename="finance_report_${today}.csv"`);
    return response;

  } else {
    // Default Order Export — always includes all fields (legacy behaviour)
    const { data: orders, error } = await supabase
      .from('orders')
      .select('order_number, status, quoted_amount, created_at, priority, delivery_date, current_stage_key, customers (name, phone)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error || !orders) {
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    // Build dynamic header
    const headerParts: string[] = [];
    if (includeOrder) headerParts.push('Order No', 'Date', 'Status', 'Priority');
    if (includeCustomer) headerParts.push('Customer', 'Phone');
    if (includeFinance) headerParts.push('Amount');
    if (includeProduction) headerParts.push('Stage');

    const header = headerParts.join(',') + '\n';

    const csvData = orders.map((order: any) => {
      const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
      const parts: string[] = [];

      if (includeOrder) {
        parts.push(
          order.order_number,
          new Date(order.created_at).toLocaleDateString(),
          order.status || '',
          order.priority ? 'Yes' : 'No'
        );
      }

      if (includeCustomer) {
        parts.push(
          customer?.name ? `"${customer.name}"` : 'Unknown',
          customer?.phone ? `"${customer.phone}"` : ''
        );
      }

      if (includeFinance) {
        parts.push(String(order.quoted_amount || 0));
      }

      if (includeProduction) {
        parts.push(order.current_stage_key || 'N/A');
      }

      return parts.join(',');
    }).join('\n');

    const csvContent = header + csvData;
    const response = new NextResponse(csvContent);
    response.headers.set('Content-Type', 'text/csv');
    response.headers.set('Content-Disposition', `attachment; filename="orders_${today}.csv"`);
    return response;
  }
}
