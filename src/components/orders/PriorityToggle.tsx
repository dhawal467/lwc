"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
  const supabase = createClient();

  if (!isAdmin) {
    return null;
  }

  const handleToggle = async (checked: boolean) => {
    setIsPriority(checked);
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ priority: checked })
        .eq('id', orderId);
        
      if (error) throw error;
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
