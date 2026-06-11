"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { Bell, Clock } from "lucide-react";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function Header({ title, subtitle, children }: HeaderProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const getPageTitle = () => {
    if (title) return title;
    const segments = pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] || segments[segments.length - 2] || "Dashboard";
    return last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-md px-6 lg:pl-[288px]">
      <div className="pl-12 lg:pl-0">
        <h1 className="text-xl font-bold tracking-tight">{getPageTitle()}</h1>
        {/* Subtitle & dept/date — only on sm+ screens */}
        {subtitle && <p className="hidden sm:block text-sm text-muted-foreground">{subtitle}</p>}
        {user && (
          <p className="hidden sm:block text-xs text-muted-foreground">
            {user.department} · {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium" id="live-clock">--:--:-- WIB</span>
        </div>
        {children}
      </div>
    </header>
  );
}