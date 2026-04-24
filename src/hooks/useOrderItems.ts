import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OrderItem } from "../../types";

export function useOrderItems(orderId: string) {
  return useQuery<OrderItem[]>({
    queryKey: ["order-items", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}/items`);
      if (!res.ok) throw new Error("Failed to fetch order items");
      return res.json();
    },
    enabled: !!orderId,
  });
}

export function useAddOrderItem(orderId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<OrderItem>) => {
      const res = await fetch(`/api/orders/${orderId}/items`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to add order item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-items", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    },
  });
}

export function useDeleteOrderItem(orderId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/order-items/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to delete order item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-items", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    },
  });
}

export function useConfirmOrderItem(orderId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/order-items/${itemId}/confirm`, {
        method: "POST",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to confirm order item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-items", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    },
  });
}

export function useAdvanceOrderItem(orderId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/order-items/${itemId}/advance`, {
        method: "POST",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to advance order item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-items", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    },
  });
}

export function useHoldOrderItem(orderId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/order-items/${itemId}/hold`, {
        method: "POST",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to hold/resume order item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-items", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    },
  });
}
