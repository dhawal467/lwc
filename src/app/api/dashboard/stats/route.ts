import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Active Orders: status != 'completed' and status != 'cancelled' and deleted_at is null
  const { count: activeOrders, error: activeError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'completed')
    .neq('status', 'cancelled')
    .is('deleted_at', null);

  // Overdue Orders: delivery_date < now() and status != 'completed'
  const today = new Date().toISOString();
  const { count: overdueOrders, error: overdueError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .lt('delivery_date', today)
    .neq('status', 'completed')
    .is('deleted_at', null);

  // Total Outstanding: Sum of quoted_amount where status != 'completed'
  const { data: outstandingData, error: outstandingError } = await supabase
    .from('orders')
    .select('quoted_amount')
    .neq('status', 'completed')
    .is('deleted_at', null);

  const totalOutstanding = outstandingData
    ? outstandingData.reduce((sum, order) => sum + (Number(order.quoted_amount) || 0), 0)
    : 0;

  return NextResponse.json({
    activeOrders: activeOrders || 0,
    overdueOrders: overdueOrders || 0,
    totalOutstanding
  });
}
