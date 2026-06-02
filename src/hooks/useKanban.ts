import { useQuery } from "@tanstack/react-query";

export type KanbanCard = Record<string, unknown> & {
  id?: string;
  item_id?: string;
  type?: string;
  blocked?: boolean;
};

export function useKanban() {
  return useQuery<Record<string, KanbanCard[]>>({
    queryKey: ["kanban"],
    queryFn: async () => {
      const res = await fetch("/api/kanban");
      if (!res.ok) {
        throw new Error("Failed to fetch kanban board data");
      }
      return res.json() as Promise<Record<string, KanbanCard[]>>;
    },
    // Poll the server every 30 seconds to keep the board fresh
    refetchInterval: 30000,
  });
}
