import React from "react";

export function KanbanSkeleton() {
  // Render a mock layout of columns
  const mockColumns = [0, 1, 2, 3];
  
  return (
    <div className="hidden md:flex flex-1 overflow-hidden gap-6 pb-6 relative opacity-70">
      {mockColumns.map((col) => (
        <div key={col} className="flex-shrink-0 w-80 flex flex-col bg-surface/50 rounded-xl overflow-hidden shadow-sm border border-border">
          {/* Column Header Skeleton */}
          <div className="px-4 py-3 border-b flex justify-between items-center bg-gray-100">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-8 bg-gray-200 rounded-full animate-pulse" />
          </div>
          
          {/* Column Body Skeleton */}
          <div className="flex-1 p-4 flex flex-col gap-4">
            {[0, 1].map((card) => (
              <div key={card} className="bg-white rounded-lg border border-border p-4 h-[120px] shadow-xs flex flex-col gap-3">
                <div className="flex justify-between">
                  <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="h-3 w-12 bg-gray-100 rounded animate-pulse mt-2" />
                
                <div className="mt-auto border-t border-border pt-3 flex justify-between">
                  <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                  <div className="h-6 w-6 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
