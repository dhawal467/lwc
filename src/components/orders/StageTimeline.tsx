import React from "react";
import { Check, Clock, AlertCircle } from "lucide-react";

type OrderStage = {
  id: string;
  stage_key: string;
  sequence_position: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
};

interface StageTimelineProps {
  stages: OrderStage[];
}

export function StageTimeline({ stages }: StageTimelineProps) {
  // Ensure stages are sorted by sequence position ascending
  const sortedStages = [...stages].sort(
    (a, b) => a.sequence_position - b.sequence_position
  );

  return (
    <div className="flex flex-col space-y-4">
      {sortedStages.map((stage, index) => {
        const isLast = index === sortedStages.length - 1;

        let icon = null;
        let ringClass = "";
        let lineClass = "bg-gray-200";
        let titleClass = "text-gray-900";

        if (stage.status === "complete") {
          ringClass = "bg-green-500 text-white border-green-500";
          icon = <Check className="w-4 h-4" />;
          lineClass = "bg-green-500";
        } else if (stage.status === "in_progress") {
          ringClass =
            "bg-white border-2 border-primary text-primary animate-pulse";
          icon = <Clock className="w-4 h-4" />;
          titleClass = "text-primary font-semibold";
        } else if (stage.status === "failed") {
          ringClass = "bg-red-500 text-white border-red-500";
          icon = <AlertCircle className="w-4 h-4" />;
          lineClass = "bg-red-500";
        } else {
          // pending
          ringClass = "bg-white border-2 border-gray-300 text-gray-300";
          titleClass = "text-gray-400";
        }

        const formatTime = (ts: string | null) => {
          if (!ts) return "";
          return new Date(ts).toLocaleString();
        };

        return (
          <div key={stage.id} className="relative flex items-start group">
            {/* Vertical Line Connecting Nodes */}
            {!isLast && (
              <div
                className={`absolute top-8 left-4 w-0.5 h-full -ml-[1px] ${lineClass}`}
                aria-hidden="true"
              />
            )}
            
            {/* The Node Icon */}
            <div
              className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${ringClass}`}
            >
              {icon}
            </div>

            {/* Stage Info */}
            <div className="ml-4 pb-8 min-w-[200px]">
              <h3 className={`text-sm font-medium ${titleClass} uppercase tracking-wider`}>
                {stage.stage_key.replace(/_/g, " ")}
              </h3>
              
              <div className="mt-1 text-xs text-gray-500 space-y-1">
                {stage.status === "complete" && stage.completed_at && (
                  <p>Completed: {formatTime(stage.completed_at)}</p>
                )}
                {stage.status === "in_progress" && stage.started_at && (
                  <p>Started: {formatTime(stage.started_at)}</p>
                )}
                {stage.status === "failed" && (
                  <p className="text-red-500 font-semibold flex items-center gap-1">
                     <AlertCircle className="w-3 h-3" /> Rework Required
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
