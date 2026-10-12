"use client";

import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { compressAndUpload } from "@/lib/upload";
import { toast } from "sonner";
import { Camera, CheckCircle2, XCircle } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface QcChecklistFormProps {
  orderId: string;
  orderStageId: string;
}

const CHECKLIST_ITEMS = [
  "Surface finish smooth?",
  "No visible gaps or cracks?",
  "Dimensions match order?",
  "Hardware fitted correctly?",
  "Polish/paint even?"
];

export function QcChecklistForm({ orderId, orderStageId }: QcChecklistFormProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [checklist, setChecklist] = useState<Record<string, boolean | null>>({});
  const [failureNotes, setFailureNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggle = (item: string, passed: boolean) => {
    triggerHaptic(20);
    setChecklist((prev) => ({ ...prev, [item]: passed }));
  };

  const allItemsAnswered = CHECKLIST_ITEMS.every((item) => checklist[item] !== undefined && checklist[item] !== null);
  const overallPassed = CHECKLIST_ITEMS.every((item) => checklist[item] === true);
  const hasFailedItems = Object.values(checklist).some((val) => val === false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Please select a QC photo before submitting.");
      
      let photo_url = "";
      setUploading(true);
      try {
        const path = `${orderId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
        photo_url = await compressAndUpload(file, path);
      } finally {
        setUploading(false);
      }

      const res = await fetch("/api/qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_stage_id: orderStageId,
          passed: overallPassed,
          checklist_json: checklist,
          failure_notes: hasFailedItems ? failureNotes : null,
          photo_url
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to submit QC");
      }
      return res.json();
    },
    onSuccess: () => {
      triggerHaptic([40, 80]);
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("✅ QC Check recorded successfully!");
      router.push(`/dashboard/orders/${orderId}`);
      router.refresh();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit QC Check");
    },
  });

  return (
    <div className="bg-surface rounded-xl border border-border p-6 shadow-sm mt-4">
      <h2 className="text-xl font-semibold mb-4 text-text-primary">QC Checklist</h2>
      <div className="space-y-4">
        {CHECKLIST_ITEMS.map((item) => (
          <div key={item} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 border border-border/80 rounded-lg bg-surface-raised gap-3">
            <span className="font-medium text-text-primary text-base">{item}</span>
            <div className="flex gap-2.5 shrink-0">
              <Button
                variant={checklist[item] === true ? "default" : "secondary"}
                className={`h-11 px-5 text-sm font-semibold min-w-[80px] transition-all ${
                  checklist[item] === true ? "bg-green-600 hover:bg-green-700 text-white shadow-sm ring-2 ring-green-600/30" : ""
                }`}
                onClick={() => handleToggle(item, true)}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Pass
              </Button>
              <Button
                variant={checklist[item] === false ? "danger" : "secondary"}
                className={`h-11 px-5 text-sm font-semibold min-w-[80px] transition-all ${
                  checklist[item] === false ? "bg-danger text-white shadow-sm ring-2 ring-danger/30" : ""
                }`}
                onClick={() => handleToggle(item, false)}
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Fail
              </Button>
            </div>
          </div>
        ))}

        {hasFailedItems && (
          <div className="mt-4 p-4 border border-danger/30 bg-danger-soft/30 rounded-lg">
            <label className="block text-sm font-semibold text-danger mb-2">Failure Notes (Required)</label>
            <textarea
              className="w-full p-3 border border-danger/30 rounded-md focus:ring-danger focus:border-danger bg-surface text-base"
              rows={3}
              value={failureNotes}
              onChange={(e) => setFailureNotes(e.target.value)}
              placeholder="Describe what failed so the floor team can correct it..."
            />
          </div>
        )}

        <div className="mt-4 p-4 border border-border rounded-lg bg-surface-raised space-y-3">
          <label className="block text-sm font-semibold text-text-primary">QC Photo (Required)</label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              ref={fileInputRef} 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="h-11 px-4 text-sm font-medium flex items-center gap-2 border-dashed border-2 hover:border-primary"
            >
              <Camera className="w-4 h-4 text-primary" />
              {file ? "Change Photo" : "📷 Tap to Take/Upload Photo"}
            </Button>
            {file && (
              <div className="flex items-center gap-3 pt-1 sm:pt-0">
                <img
                  src={URL.createObjectURL(file)}
                  alt="QC Preview"
                  className="w-12 h-12 object-cover rounded-md border border-border shadow-xs"
                />
                <div className="text-xs">
                  <p className="font-semibold text-text-primary truncate max-w-[180px]">{file.name}</p>
                  <p className="text-text-muted">{(file.size / 1024).toFixed(0)} KB ready</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          onClick={() => mutation.mutate()}
          disabled={!allItemsAnswered || (hasFailedItems && !failureNotes.trim()) || mutation.isPending || uploading || !file}
          size="lg"
          className="shadow-pop text-base"
        >
          {mutation.isPending || uploading ? "Compressing & Submitting..." : "Submit QC"}
        </Button>
      </div>
    </div>
  );
}
