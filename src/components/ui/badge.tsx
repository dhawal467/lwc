import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-soft focus:ring-offset-2",
        {
          "bg-primary text-primary-text": variant === "default",
          "bg-surface-raised text-text-secondary": variant === "secondary",
          "border border-border text-text-primary bg-transparent": variant === "outline"
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
