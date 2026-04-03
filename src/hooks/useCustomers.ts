import { useQuery } from "@tanstack/react-query";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  notes: string | null;
  created_at: string;
};

async function fetchCustomers(): Promise<Customer[]> {
  const res = await fetch("/api/customers");
  if (!res.ok) throw new Error("Failed to fetch customers");
  return res.json();
}

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });
}
