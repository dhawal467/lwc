import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PaymentLedgerEntry } from "../../types";

export interface PaymentSummary {
  quoted_amount: number;
  total_paid: number;
  balance_due: number;
}

export interface PaymentsResponse {
  payments: PaymentLedgerEntry[];
  summary: PaymentSummary;
}

export function usePayments(orderId: string) {
  return useQuery<PaymentsResponse>({
    queryKey: ["payments", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}/payments`);
      if (!res.ok) throw new Error("Failed to fetch payments");
      return res.json();
    },
    enabled: !!orderId,
  });
}

export function useAddPayment(orderId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<PaymentLedgerEntry>) => {
      const res = await fetch(`/api/orders/${orderId}/payments`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to add payment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", orderId] });
    },
  });
}

export function useDeletePayment(orderId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to delete payment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", orderId] });
    },
  });
}
