// Stat Card component for dashboards
import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  trend?: { up: boolean; value: string };
  variant?: "default" | "success" | "warning" | "destructive";
}

export function StatCard({ label, value, sub, icon, trend, variant = "default" }: StatCardProps) {
  const variantStyles = {
    default: "border-border",
    success: "border-emerald-200 bg-emerald-50/30",
    warning: "border-amber-200 bg-amber-50/30",
    destructive: "border-red-200 bg-red-50/30",
  };

  const iconBg = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-100 text-emerald-600",
    warning: "bg-amber-100 text-amber-600",
    destructive: "bg-red-100 text-red-600",
  };

  return (
    <div className={cn("rounded-xl border bg-card p-5 shadow-sm", variantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          {trend && (
            <p className={cn("text-xs font-medium mt-1", trend.up ? "text-emerald-600" : "text-red-600")}>
              {trend.up ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg shrink-0", iconBg[variant])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// Flag badge helper
export function FlagBadge({ flag }: { flag: string }) {
  const styles: Record<string, { bg: string; text: string; dot: string }> = {
    ON_TIME: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
    LATE: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
    VERY_LATE: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
    ABSENT_FLAG: { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" },
  };
  const s = styles[flag] || styles.ABSENT_FLAG;
  const labels: Record<string, string> = {
    ON_TIME: "On Time",
    LATE: "Late",
    VERY_LATE: "Very Late",
    ABSENT_FLAG: "Absent",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", s.bg, s.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {labels[flag] || flag}
    </span>
  );
}

// Leave Status badge
export function LeaveStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: "bg-amber-100", text: "text-amber-700" },
    APPROVED_L1: { bg: "bg-blue-100", text: "text-blue-700" },
    APPROVED: { bg: "bg-emerald-100", text: "text-emerald-700" },
    REJECTED: { bg: "bg-red-100", text: "text-red-700" },
    CANCELLED: { bg: "bg-gray-100", text: "text-gray-600" },
  };
  const labels: Record<string, string> = {
    PENDING: "Pending",
    APPROVED_L1: "Approved L1",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    CANCELLED: "Cancelled",
  };
  const s = styles[status] || styles.PENDING;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", s.bg, s.text)}>
      {labels[status] || status}
    </span>
  );
}