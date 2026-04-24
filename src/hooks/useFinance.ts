import { useQuery } from "@tanstack/react-query";

export function useOutstandingReport() {
  return useQuery({
    queryKey: ["finance", "outstanding"],
    queryFn: async () => {
      const res = await fetch("/api/finance/outstanding");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch finance report");
      }
      return res.json();
    },
  });
}
