"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { STAGE_CONFIG, StageKey } from "@/lib/fsm/tracks";

interface FsmControlsProps {
  order: any;
  currentStage?: any; // The 'in_progress' stage row, if any
}

export function FsmControls({ order, currentStage }: FsmControlsProps) {
  const queryClient = useQueryClient();
  const router = useRouter();

  // Determine Sanding Rule
  const stageKey = currentStage?.stage_key as StageKey | undefined;
  const requiresSanding = stageKey ? STAGE_CONFIG[stageKey]?.requiresSanding : false;

  const inProduction = order.status === "in_production";
  const onHold = order.status === "on_hold";
  const confirmed = order.status === "confirmed";

  // Mutations
  const confirmMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${order.id}/confirm`, {
        method: "POST",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to start production");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.refresh();
      alert("Production started!");
    },
    onError: (error: Error) => alert(error.message),
  });

  const advanceMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${order.id}/advance`, {
        method: "POST",
      });
      
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to advance stage");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.refresh();
      alert("Stage advanced successfully");
    },
    onError: (error: Error) => alert(error.message),
  });

  const toggleHoldMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${order.id}/hold`, {
        method: "POST",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to toggle hold status");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.refresh();
      alert(`Order is now ${data.status.replace("_", " ")}`);
    },
    onError: (error: Error) => alert(error.message),
  });

  const sandingMutation = useMutation({
    mutationFn: async (sanding_complete: boolean) => {
      if (!currentStage) return;
      const res = await fetch(`/api/stages/${currentStage.id}/sanding`, {
        method: "PATCH",
        body: JSON.stringify({ sanding_complete }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to update sanding status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.refresh();
    },
    onError: (error: Error) => alert(error.message),
  });

  const handleSandingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    sandingMutation.mutate(e.target.checked);
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-6 mt-6 shadow-sm">
      <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <span className="bg-primary/10 text-primary p-1.5 rounded-md">⚙️</span>
        Production Engine
      </h3>

      <div className="flex flex-col gap-4">
        {confirmed && (
          <Button
            size="lg"
            className="w-full justify-start text-left"
            onClick={() => confirmMutation.mutate()}
            disabled={confirmMutation.isPending}
          >
            {confirmMutation.isPending ? "Starting..." : "🚀 Confirm Order & Start Production"}
          </Button>
        )}

        {inProduction && currentStage && (
          <div className="flex flex-col gap-3 p-4 bg-primary-soft/30 border border-primary/20 rounded-lg">
            {requiresSanding && (
              <label className="flex items-center gap-3 p-3 bg-white rounded-md border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  className="w-5 h-5 text-primary rounded focus:ring-primary disabled:opacity-50"
                  checked={currentStage.sanding_complete || false}
                  onChange={handleSandingChange}
                  disabled={sandingMutation.isPending}
                />
                <span className="text-sm font-medium text-gray-700">
                  {sandingMutation.isPending ? "Updating..." : "Mark Sanding as Complete"}
                </span>
              </label>
            )}

            {currentStage.stage_key === "qc_check" ? (
              <Button
                onClick={() => router.push(`/dashboard/orders/${order.id}/qc`)}
                className="w-full text-base py-6 shadow-pop bg-green-600 hover:bg-green-700 text-white"
              >
                ✅ Run QC Check
              </Button>
            ) : (
              <Button
                onClick={() => advanceMutation.mutate()}
                disabled={advanceMutation.isPending || (requiresSanding && !currentStage.sanding_complete)}
                className="w-full text-base py-6 shadow-pop"
              >
                {advanceMutation.isPending ? "Advancing..." : "Advance Stage →"}
              </Button>
            )}
          </div>
        )}

        {inProduction && (
          <Button
            variant="secondary"
            onClick={() => toggleHoldMutation.mutate()}
            disabled={toggleHoldMutation.isPending}
          >
            {toggleHoldMutation.isPending ? "Updating..." : "⏸ Put on Hold"}
          </Button>
        )}

        {onHold && (
          <Button
            onClick={() => toggleHoldMutation.mutate()}
            disabled={toggleHoldMutation.isPending}
            className="w-full py-6 text-base shadow-pop"
          >
            {toggleHoldMutation.isPending ? "Resuming..." : "▶ Resume Production"}
          </Button>
        )}
      </div>
    </div>
  );
}
