"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface PriorityToggleProps {
  orderId: string;
  initialPriority: boolean;
  isAdmin: boolean;
}

export function PriorityToggle({ orderId, initialPriority, isAdmin }: PriorityToggleProps) {
  const [isPriority, setIsPriority] = useState(initialPriority);
  const [isLoading, setIsLoading] = useState(false);

  if (!isAdmin) {
    return null;
  }

  const handleToggle = async (checked: boolean) => {
    setIsPriority(checked);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/priority`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: checked }),
      });

      if (!res.ok) {
        throw new Error("Failed to set priority");
      }
    } catch (error) {
      console.error("Error setting priority:", error);
      setIsPriority(!checked); // Revert on failure
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch 
        id="priority-mode" 
        checked={isPriority}
        onCheckedChange={handleToggle}
        disabled={isLoading}
      />
      <Label htmlFor="priority-mode" className="font-semibold text-danger">Priority</Label>
    </div>
  );
}
