import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";

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
  track: string | null;
  status: string;
  current_stage_key: string | null;
  priority: boolean;
  delivery_date: string | null;
  description: string | null;
  quoted_amount: number | null;
  deleted_at: string | null;
  created_at: string;
  created_by: string;
  order_items?: {
    id: string;
    name: string;
    status: string;
    track: string;
    current_stage_key: string | null;
  }[];
  payment_ledger?: {
    amount: number;
  }[];
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

export function useOrder(id: string, initialData?: any) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) throw new Error("Failed to fetch order");
      return res.json();
    },
    initialData,
  });
}

export function useCompletedOrders(search?: string) {
  return useInfiniteQuery({
    queryKey: ["completed-orders", search],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({ page: pageParam.toString() });
      if (search) params.set("search", search);
      
      const res = await fetch(`/api/orders/completed?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch completed orders");
      return res.json() as Promise<{ data: Order[]; count: number }>;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loadedItemCount = allPages.reduce((acc, page) => acc + page.data.length, 0);
      if (loadedItemCount >= lastPage.count) {
        return undefined; // No more pages
      }
      return allPages.length + 1;
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to delete order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
    },
  });
}
