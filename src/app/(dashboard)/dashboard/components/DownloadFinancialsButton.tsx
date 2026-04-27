"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

export function DownloadFinancialsButton() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const res = await fetch("/api/export?type=finance");
      
      if (!res.ok) {
        throw new Error("Failed to generate report");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `full_financial_report_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Report downloaded successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button 
      variant="default" 
      className="w-full sm:w-auto flex items-center justify-center gap-2"
      onClick={handleExport}
      disabled={isExporting}
    >
      <Download className="w-4 h-4" />
      {isExporting ? "Generating..." : "Download Full Financial Report"}
    </Button>
  );
}
