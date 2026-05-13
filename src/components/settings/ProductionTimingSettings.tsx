"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STAGE_LABELS } from "@/lib/design-constants";
import { Button } from "@/components/ui/button";
import { Loader2, Save, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StageConfig {
  id: string;
  track: string;
  stage_key: string;
  expected_hours: number;
}

export function ProductionTimingSettings() {
  const queryClient = useQueryClient();
  const [changes, setChanges] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data: configs, isLoading, isError } = useQuery<StageConfig[]>({
    queryKey: ["production-timing"],
    queryFn: async () => {
      const res = await fetch("/api/settings/production-timing");
      if (!res.ok) throw new Error("Failed to fetch production timing settings");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { id: string; expected_hours: number }[]) => {
      const res = await fetch("/api/settings/production-timing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs: payload }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save settings");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-timing"] });
      setChanges({});
      setToast({ type: "success", message: "Settings saved successfully!" });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err: Error) => {
      setToast({ type: "error", message: err.message });
    },
  });

  const handleInputChange = (id: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setChanges((prev) => ({ ...prev, [id]: numValue }));
    }
  };

  const handleSave = () => {
    const payload = Object.entries(changes).map(([id, expected_hours]) => ({
      id,
      expected_hours,
    }));
    if (payload.length > 0) {
      saveMutation.mutate(payload);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !configs) {
    return (
      <div className="p-4 bg-danger-soft text-danger border border-danger/20 rounded-lg flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        Failed to load production timing settings.
      </div>
    );
  }

  // Group by track
  const tracks = Array.from(new Set(configs.map((c) => c.track))).sort();

  const hasChanges = Object.keys(changes).length > 0;

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={cn(
            "flex items-center gap-3 p-4 rounded-lg border text-sm font-medium animate-in fade-in slide-in-from-top-2",
            toast.type === "success"
              ? "bg-success/10 border-success/30 text-success"
              : "bg-danger-soft border-danger/20 text-danger"
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-raised border-b border-border">
            <tr>
              <th className="px-4 py-3 font-semibold text-text-secondary">Stage</th>
              <th className="px-4 py-3 font-semibold text-text-secondary w-32 text-right">Expected Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {tracks.map((track) => (
              <React.Fragment key={track}>
                <tr className="bg-primary-soft/30">
                  <td colSpan={2} className="px-4 py-1.5 font-bold text-[10px] uppercase tracking-widest text-primary">
                    Track {track}
                  </td>
                </tr>
                {configs
                  .filter((c) => c.track === track)
                  .map((config) => {
                    const isChanged = config.id in changes;
                    const displayValue = isChanged ? changes[config.id] : config.expected_hours;

                    return (
                      <tr key={config.id} className="bg-surface hover:bg-surface-raised transition-colors">
                        <td className="px-4 py-3 font-medium text-text-primary capitalize">
                          {STAGE_LABELS[config.stage_key] || config.stage_key.replace("_", " ")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={displayValue}
                            onChange={(e) => handleInputChange(config.id, e.target.value)}
                            className={cn(
                              "w-20 px-2 py-1 bg-surface border border-border rounded text-right font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all",
                              isChanged && "border-primary ring-1 ring-primary/20 bg-primary-soft/5"
                            )}
                          />
                        </td>
                      </tr>
                    );
                  })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          disabled={!hasChanges || saveMutation.isPending}
          onClick={handleSave}
          className="min-w-[160px]"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
