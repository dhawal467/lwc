import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: "default" | "secondary" | "ghost" | "danger"
  size?: "default" | "sm" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center rounded-md text-base font-body font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          {
            "bg-primary text-white hover:bg-primary-hover hover:shadow-pop": variant === "default",
            "bg-surface border border-border text-text-primary hover:bg-surface-raised": variant === "secondary",
            "bg-transparent text-text-secondary hover:bg-surface-raised": variant === "ghost",
            "bg-danger-soft text-danger hover:bg-danger hover:text-white": variant === "danger",
            "h-10 px-4": size === "default",
            "h-8 px-3 text-sm": size === "sm",
            "h-12 px-6": size === "lg",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
