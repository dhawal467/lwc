"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface OrderEventsTimelineProps {
  orderId: string;
}

export function OrderEventsTimeline({ orderId }: OrderEventsTimelineProps) {
  const queryClient = useQueryClient();
  const [noteContent, setNoteContent] = useState("");

  const { data: events, isLoading, isError } = useQuery({
    queryKey: ["order-events", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}/events`);
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/orders/${orderId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to add note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-events", orderId] });
      setNoteContent("");
    },
    onError: (err: Error) => alert(err.message),
  });

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    addNoteMutation.mutate(noteContent);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getEventIconAndMessage = (event: any) => {
    const p = event.payload || {};
    const actorName = event.actor?.full_name || "System";

    switch (event.event_type) {
      case "note":
        return { icon: "📝", message: `${actorName} added note: "${p.content}"` };
      case "stage_change":
        return { icon: "⚡", message: `Item ${p.item_name || ''} moved from ${p.from_stage} → ${p.to_stage}` };
      case "blocked":
        return { icon: "🚫", message: `Item ${p.item_name || ''} blocked: ${p.reason}${p.note ? ` - ${p.note}` : ''}` };
      case "unblocked":
        return { icon: "✅", message: `Item ${p.item_name || ''} unblocked (was blocked ${p.blocked_hours}h)` };
      case "payment":
        return { icon: "💰", message: `₹${p.amount} ${p.payment_type || ''} recorded by ${p.recorded_by_name || actorName}` };
      case "ownership_change":
        return { icon: "👤", message: `${actorName} reassigned order ownership` };
      case "item_added":
        return { icon: "➕", message: `Item added: ${p.item_name} (Track ${p.track})` };
      case "item_cancelled":
        return { icon: "🗑️", message: `Item cancelled: ${p.item_name || ''}` };
      case "delivery_date_changed":
        return { icon: "📅", message: `${actorName} changed delivery date${p.to ? ` to ${new Date(p.to).toLocaleDateString()}` : ''}` };
      case "qc_result":
        return { icon: p.passed ? "✅" : "❌", message: `QC ${p.passed ? "passed" : "failed"} for ${p.item_name || 'item'}${p.notes ? `: ${p.notes}` : ''}` };
      default:
        return { icon: "📌", message: `${event.event_type.replace(/_/g, ' ')}` };
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-6 shadow-sm flex flex-col gap-6">
      <form onSubmit={handleAddNote} className="flex gap-2">
        <Input
          placeholder="Add a note or update..."
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          disabled={addNoteMutation.isPending}
          className="flex-1"
        />
        <Button type="submit" disabled={!noteContent.trim() || addNoteMutation.isPending}>
          {addNoteMutation.isPending ? "..." : <Send className="w-4 h-4" />}
        </Button>
      </form>

      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {isLoading ? (
          <div className="text-center text-text-muted py-4 animate-pulse">Loading activity...</div>
        ) : isError ? (
          <div className="text-center text-danger py-4">Failed to load activity timeline.</div>
        ) : !events || events.length === 0 ? (
          <div className="text-center text-text-muted py-8 bg-surface-raised rounded-lg border border-dashed border-border">
            No activity yet.
          </div>
        ) : (
          <div className="relative border-l-2 border-border/50 ml-3 pl-5 space-y-6">
            {events.map((event: any) => {
              const { icon, message } = getEventIconAndMessage(event);
              return (
                <div key={event.id} className="relative">
                  <div className="absolute -left-[32px] top-0 w-6 h-6 bg-surface border border-border rounded-full flex items-center justify-center text-xs shadow-sm">
                    {icon}
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm text-text-primary">{message}</p>
                    <p className="text-xs text-text-muted mt-1">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
