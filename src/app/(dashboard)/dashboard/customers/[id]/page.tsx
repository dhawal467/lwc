"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit2, Phone, MapPin, Trash2, Check, X, Loader2 } from "lucide-react";

export default function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = params;
  const [isEditing, setIsEditing] = useState(false);
  
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    address: "",
    notes: "",
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${id}`);
      if (!res.ok) throw new Error("Failed to fetch customer");
      const json = await res.json();
      setEditForm({
        name: json.customer.name || "",
        phone: json.customer.phone || "",
        address: json.customer.address || "",
        notes: json.customer.notes || "",
      });
      return json;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      router.push("/dashboard/customers");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !data?.customer) {
    return (
      <div className="text-center py-20 text-danger font-medium border border-danger/20 bg-danger-soft p-4 rounded-md">
        Failed to load customer details.
      </div>
    );
  }

  const { customer, orders } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="secondary" size="sm" onClick={() => router.back()} className="shrink-0 h-9 w-9 p-0 flex items-center justify-center rounded-full">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-display font-bold text-text-primary">
          Customer Profile
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Info Card */}
        <Card className="lg:col-span-1 shadow-sm border border-border bg-surface h-fit">
          <CardHeader className="border-b border-border pb-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg font-display">Details</CardTitle>
            {!isEditing ? (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-8 px-2">
                <Edit2 className="w-4 h-4 text-text-secondary" />
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="pt-6">
            {!isEditing ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-text-primary">{customer.name}</h2>
                  <p className="text-xs text-text-muted mt-1">
                    Added {new Date(customer.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3 text-text-secondary">
                    <Phone className="w-4 h-4 shrink-0 text-primary/70 mt-0.5" />
                    <span className="font-mono text-sm">{customer.phone}</span>
                  </div>
                  <div className="flex items-start gap-3 text-text-secondary">
                    <MapPin className="w-4 h-4 shrink-0 text-primary/70 mt-0.5" />
                    <span className="text-sm leading-relaxed">
                      {customer.address || "No address provided"}
                    </span>
                  </div>
                </div>

                {customer.notes && (
                  <div className="pt-4 border-t border-border">
                    <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Notes</h3>
                    <p className="text-sm text-text-primary whitespace-pre-wrap">
                      {customer.notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Name</label>
                  <Input 
                    value={editForm.name} 
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Phone</label>
                  <Input 
                    value={editForm.phone} 
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Address</label>
                  <Input 
                    value={editForm.address} 
                    onChange={(e) => setEditForm({...editForm, address: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Notes</label>
                  <textarea 
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                    value={editForm.notes} 
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})} 
                  />
                </div>
                
                <div className="flex gap-2 pt-4 border-t border-border mt-6">
                  <Button 
                    variant="default" 
                    className="flex-1" 
                    onClick={() => updateMutation.mutate(editForm)}
                    disabled={updateMutation.isPending}
                  >
                    <Check className="w-4 h-4 mr-2" /> Save
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="flex-1" 
                    onClick={() => setIsEditing(false)}
                    disabled={updateMutation.isPending}
                  >
                    <X className="w-4 h-4 mr-2" /> Cancel
                  </Button>
                </div>
                <div className="pt-2">
                  <Button
                    variant="ghost"
                    className="w-full text-danger hover:bg-danger-soft hover:text-danger"
                    onClick={() => {
                      if (confirm("Are you sure you want to permanently delete this customer?")) {
                        deleteMutation.mutate();
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel: Order History */}
        <Card className="lg:col-span-2 shadow-sm border border-border bg-surface h-fit">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-lg font-display">Order History</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {orders && orders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-2">📜</p>
                <p className="text-sm font-medium text-text-secondary">No orders found for this customer.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {orders?.map((order: any) => (
                  <div key={order.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-raised px-2 -mx-2 transition-colors rounded-sm cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="font-mono text-xs font-semibold text-primary bg-primary-soft px-2 py-1 rounded inline-block">
                        {order.order_number}
                      </div>
                      <div className="text-sm font-medium text-text-primary">
                        {order.description || "Production Order"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="capitalize text-xs font-medium border-border">
                        {order.status.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-text-muted font-mono w-20 text-right">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
