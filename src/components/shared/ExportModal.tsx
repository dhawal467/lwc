"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileSpreadsheet, Users, IndianRupee, Factory } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FIELD_SECTIONS = [
  {
    id: "order",
    label: "Core Order Data",
    description: "Order #, Date, Status, Priority",
    icon: FileSpreadsheet,
  },
  {
    id: "customer",
    label: "Customer Info",
    description: "Name, Phone",
    icon: Users,
  },
  {
    id: "finance",
    label: "Financial Data",
    description: "Quoted, Paid, Balance Due",
    icon: IndianRupee,
  },
  {
    id: "production",
    label: "Production Data",
    description: "Current Stage",
    icon: Factory,
  },
] as const;

type FieldId = (typeof FIELD_SECTIONS)[number]["id"];

export function ExportModal({ open, onOpenChange }: ExportModalProps) {
  const [selectedFields, setSelectedFields] = useState<Record<FieldId, boolean>>({
    order: true,
    customer: true,
    finance: true,
    production: true,
  });
  const [isExporting, setIsExporting] = useState(false);

  const toggleField = (fieldId: FieldId) => {
    setSelectedFields((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }));
  };

  const activeFields = Object.entries(selectedFields)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const handleDownload = async () => {
    if (activeFields.length === 0) {
      toast.error("Select at least one data section.");
      return;
    }

    try {
      setIsExporting(true);
      const params = new URLSearchParams({
        type: "finance",
        fields: activeFields.join(","),
      });

      const res = await fetch(`/api/export?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to generate report");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Report downloaded successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>
            Choose which data sections to include in the CSV export.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-3">
          {FIELD_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isChecked = selectedFields[section.id];

            return (
              <label
                key={section.id}
                className={cn(
                  "flex items-center gap-4 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  isChecked
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-surface hover:border-text-muted"
                )}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleField(section.id)}
                  className="sr-only"
                />
                <div
                  className={cn(
                    "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    isChecked
                      ? "bg-primary border-primary"
                      : "border-border bg-surface"
                  )}
                >
                  {isChecked && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                <div
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                    isChecked ? "bg-primary/10 text-primary" : "bg-surface-raised text-text-muted"
                  )}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>

                <div className="min-w-0">
                  <p className={cn(
                    "text-sm font-semibold leading-tight",
                    isChecked ? "text-text-primary" : "text-text-secondary"
                  )}>
                    {section.label}
                  </p>
                  <p className="text-[11px] text-text-muted leading-tight mt-0.5">
                    {section.description}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="sm:flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDownload}
            disabled={isExporting || activeFields.length === 0}
            className="sm:flex-1 gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download CSV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
