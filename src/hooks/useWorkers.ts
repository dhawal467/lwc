import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type Worker = {
  id: string;
  name: string;
  department?: string | null;
  phone?: string | null;
  active: boolean;
};

export type Attendance = {
  id: string;
  worker_id: string;
  date: string;
  status: string;
  shifts_worked: number;
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
    mutationFn: async ({ worker_id, date, status, shifts_worked }: { worker_id: string, date: string, status: string, shifts_worked: number }) => {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worker_id, date, status, shifts_worked }),
      });
      if (!res.ok) throw new Error("Failed to mark attendance");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Attendance updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
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
      toast.success("Worker status updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useAddWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (worker: Partial<Worker>) => {
      const res = await fetch("/api/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(worker),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to add worker");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      toast.success("Worker added successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Worker> & { id: string }) => {
      const res = await fetch(`/api/workers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to update worker");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      toast.success("Worker updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to delete worker");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      toast.success("Worker deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
