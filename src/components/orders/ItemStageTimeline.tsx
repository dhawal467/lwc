import React from 'react';
import { OrderStage } from '../../../types';
import { STAGE_LABELS, STAGE_COLORS } from '@/lib/design-constants';
import { cn } from '@/lib/utils';

interface ItemStageTimelineProps {
  stages: OrderStage[];
}

export function ItemStageTimeline({ stages }: ItemStageTimelineProps) {
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const sortedStages = [...stages].sort((a, b) => a.sequence_position - b.sequence_position);

  return (
    <div className="flex items-start space-x-1 sm:space-x-2 overflow-x-auto py-2 px-1 scrollbar-hide">
      {sortedStages.map((stage, index) => {
        const isLast = index === sortedStages.length - 1;
        const label = STAGE_LABELS[stage.stage_key] || stage.stage_key;
        const stageColorObj = STAGE_COLORS[stage.stage_key];
        
        let dotClasses = "w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0 shadow-sm ";
        let innerContent: React.ReactNode = null;
        let style: React.CSSProperties = {};

        switch (stage.status) {
          case 'complete':
            dotClasses += "bg-green-500 text-white";
            innerContent = "✓";
            break;
          case 'in_progress':
            dotClasses += "bg-blue-500 text-white animate-pulse ring-2 ring-blue-300 ring-offset-1";
            break;
          case 'failed':
            dotClasses += "bg-red-500 text-white";
            innerContent = "!";
            break;
          case 'cancelled':
            dotClasses += "bg-gray-300 text-gray-600";
            innerContent = "✕";
            break;
          case 'pending':
          default:
            dotClasses += "bg-gray-200 border border-gray-300";
            break;
        }

        return (
          <React.Fragment key={stage.id}>
            <div className="relative group shrink-0">
              <div className="flex flex-col items-center">
                <div className={dotClasses} style={style}>
                  {innerContent}
                </div>
                
                <span className={cn(
                  "text-[9px] sm:text-[10px] font-medium mt-1 text-center leading-tight block max-w-[60px] truncate",
                  stage.status === 'complete' ? 'text-green-600' :
                  stage.status === 'in_progress' ? 'text-blue-600 font-bold' :
                  'text-gray-400'
                )}>
                  {label.replace(/^[^\w]*/, '')} {/* Strip leading emoji */}
                </span>
              </div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col z-10 w-max bg-white shadow-lg rounded-md border text-xs overflow-hidden pointer-events-none">
                <div 
                  className="px-2 py-1 font-semibold text-white" 
                  style={{ backgroundColor: stageColorObj?.dark || '#374151' }}
                >
                  {label}
                </div>
                <div className="p-2 text-gray-600">
                  <div className="font-medium text-gray-900 capitalize mb-1">{stage.status.replace('_', ' ')}</div>
                  {mounted && stage.started_at && <div className="text-[10px]">Start: {new Date(stage.started_at).toLocaleString()}</div>}
                  {mounted && stage.completed_at && <div className="text-[10px]">End: {new Date(stage.completed_at).toLocaleString()}</div>}
                </div>
              </div>
            </div>

            {!isLast && (
              <div 
                className={cn(
                  "h-0.5 sm:h-1 w-6 sm:w-10 shrink-0 mt-2.5 sm:mt-3",
                  stage.status === 'complete' ? 'bg-green-400' : 'bg-gray-200'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
