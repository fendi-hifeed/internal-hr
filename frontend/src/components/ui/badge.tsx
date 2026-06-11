import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "destructive" | "outline" | "secondary";
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants: Record<string, string> = {
      default: "bg-primary/10 text-primary border-primary/20",
      success: "bg-emerald-100 text-emerald-700 border-emerald-200",
      warning: "bg-amber-100 text-amber-700 border-amber-200",
      destructive: "bg-red-100 text-red-700 border-red-200",
      outline: "bg-transparent border-border text-foreground",
      secondary: "bg-secondary text-secondary-foreground border-secondary",
    };
    return (
      <span
        ref={ref}
        className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors", variants[variant], className)}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";