"use client";

import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { compressAndUpload } from "@/lib/upload";

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
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      alert("QC Check recorded successfully!");
      router.push(`/dashboard/orders/${orderId}`);
      router.refresh();
    },
    onError: (error: Error) => {
      alert(error.message);
    },
  });

  return (
    <div className="bg-surface rounded-xl border border-border p-6 shadow-sm mt-4">
      <h2 className="text-xl font-semibold mb-4 text-text-primary">QC Checklist</h2>
      <div className="space-y-4">
        {CHECKLIST_ITEMS.map((item) => (
          <div key={item} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg bg-gray-50">
            <span className="font-medium text-gray-800">{item}</span>
            <div className="flex gap-2">
              <Button
                variant={checklist[item] === true ? "default" : "secondary"}
                className={checklist[item] === true ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                onClick={() => handleToggle(item, true)}
                size="sm"
              >
                Pass
              </Button>
              <Button
                variant={checklist[item] === false ? "danger" : "secondary"}
                onClick={() => handleToggle(item, false)}
                size="sm"
              >
                Fail
              </Button>
            </div>
          </div>
        ))}

        {hasFailedItems && (
          <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-lg">
            <label className="block text-sm font-semibold text-red-800 mb-2">Failure Notes (Required)</label>
            <textarea
              className="w-full p-2 border border-red-300 rounded-md focus:ring-red-500 focus:border-red-500"
              rows={3}
              value={failureNotes}
              onChange={(e) => setFailureNotes(e.target.value)}
              placeholder="Describe what failed..."
            />
          </div>
        )}

        <div className="mt-4 p-4 border border-gray-200 bg-gray-50 rounded-lg">
          <label className="block text-sm font-semibold text-gray-800 mb-2">QC Photo (Required)</label>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm"
          />
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
