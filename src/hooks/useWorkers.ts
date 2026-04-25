import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type Worker = {
  id: string;
  name: string;
  department: string;
  phone: string;
  active: boolean;
};

export type Attendance = {
  id: string;
  worker_id: string;
  date: string;
  status: string;
};

export function useWorkers() {
  return useQuery<Worker[]>({
    queryKey: ["workers"],
    queryFn: async () => {
      const res = await fetch("/api/workers");
      if (!res.ok) throw new Error("Failed to fetch workers");
      return res.json();
    },
  });
}

export function useAttendance(startDate: string, endDate: string) {
  return useQuery<Attendance[]>({
    queryKey: ["attendance", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/attendance?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return res.json();
    },
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ worker_id, date, status }: { worker_id: string, date: string, status: string }) => {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worker_id, date, status }),
      });
      if (!res.ok) throw new Error("Failed to mark attendance");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useToggleWorkerStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`/api/workers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to update worker status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] });
    },
  });
}
