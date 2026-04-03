import { useQuery } from "@tanstack/react-query";

export type Customer = {
  id: string;
  name: string;
  phone: string;
};

export type Order = {
  id: string;
  order_number: string;
  customer_id: string;
  customers: Customer | null;
  track: string;
  status: string;
  current_stage_key: string | null;
  priority: boolean;
  delivery_date: string | null;
  description: string | null;
  quoted_amount: number | null;
  deleted_at: string | null;
  created_at: string;
  created_by: string;
};

type OrderFilters = {
  status?: string;
  customer_id?: string;
  search?: string;
};

async function fetchOrders(filters: OrderFilters): Promise<Order[]> {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.customer_id) params.set("customer_id", filters.customer_id);

  const url = `/api/orders${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

export function useOrders(filters: OrderFilters = {}) {
  return useQuery({
    queryKey: ["orders", filters],
    queryFn: () => fetchOrders(filters),
  });
}
