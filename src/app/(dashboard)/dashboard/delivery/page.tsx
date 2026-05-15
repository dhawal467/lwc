"use client";
import { DeliveryLoadStrip } from "@/components/orders/DeliveryLoadStrip";

export default function DeliveryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-text-primary">Delivery Calendar</h1>
        <p className="text-text-secondary mt-1">Overdue backlog + upcoming delivery load across the next 8 weeks.</p>
      </div>
      <DeliveryLoadStrip />
    </div>
  );
}
