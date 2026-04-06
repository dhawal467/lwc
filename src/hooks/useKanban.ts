import { useQuery } from "@tanstack/react-query";

export function useKanban() {
  return useQuery({
    queryKey: ["kanban"],
    queryFn: async () => {
      const res = await fetch("/api/kanban");
      if (!res.ok) {
        throw new Error("Failed to fetch kanban board data");
      }
      return res.json();
    },
    // Poll the server every 30 seconds to keep the board fresh
    refetchInterval: 30000,
  });
}
