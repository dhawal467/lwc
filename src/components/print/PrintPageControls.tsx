"use client";

import { Printer, ArrowLeft } from "lucide-react";

export function PrintPageControls({ title }: { title: string }) {
  return (
    <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.close()}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <span className="text-gray-300">|</span>
        <span className="text-sm text-gray-500 truncate max-w-xs">{title}</span>
      </div>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
      >
        <Printer className="w-4 h-4" />
        Print / Save as PDF
      </button>
    </div>
  );
}
