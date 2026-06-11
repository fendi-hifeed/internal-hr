"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import LogoSvg from "@/components/layout/logo";
import {
  LayoutDashboard, Clock, CalendarDays, Users, MapPin,
  LogOut, Menu, X, ChevronDown, Shield, Settings,
  FileText, CheckCircle2, BarChart3, UserCheck, ClipboardList,
} from "lucide-react";

const hrNavGroups = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    basePath: "/hr",
    items: [{ label: "Overview", href: "/hr" }],
  },
  {
    label: "Absensi",
    icon: Clock,
    basePath: "/hr/attendance",
    items: [
      { label: "Clock In / Out", href: "/hr/attendance" },
      { label: "Riwayat Absensi", href: "/hr/attendance/history" },
    ],
  },
  {
    label: "Cuti",
    icon: CalendarDays,
    basePath: "/hr/leave",
    items: [
      { label: "Ajukan Cuti", href: "/hr/leave/request" },
      { label: "Status & Riwayat", href: "/hr/leave" },
    ],
  },
  {
    label: "Profil",
    icon: Users,
    basePath: "/hr/profile",
    items: [{ label: "Profil Saya", href: "/hr/profile" }],
  },
];

const adminNavGroups = [
  {
    label: "Dashboard Admin",
    icon: BarChart3,
    basePath: "/hr/admin",
    items: [{ label: "Overview HR", href: "/hr/admin" }],
  },
  {
    label: "Karyawan",
    icon: Users,
    basePath: "/hr/admin/employees",
    items: [{ label: "Kelola Karyawan", href: "/hr/admin/employees" }],
  },
  {
    label: "Tipe Cuti",
    icon: Settings,
    basePath: "/hr/admin/leave-types",
    items: [{ label: "Konfigurasi Cuti", href: "/hr/admin/leave-types" }],
  },
  {
    label: "Geo Zones",
    icon: MapPin,
    basePath: "/hr/admin/geo-zones",
    items: [{ label: "Lokasi Kantor", href: "/hr/admin/geo-zones" }],
  },
  {
    label: "Approval Cuti",
    icon: CheckCircle2,
    basePath: "/hr/admin/leave-approvals",
    items: [{ label: "Pending Approvals", href: "/hr/admin/leave-approvals" }],
  },
  {
    label: "Laporan",
    icon: FileText,
    basePath: "/hr/admin/reports",
    items: [{ label: "Export Laporan", href: "/hr/admin/reports" }],
  },
  {
    label: "Clearance",
    icon: UserCheck,
    basePath: "/hr/admin/clearance",
    items: [
      { label: "Resignasi", href: "/hr/admin/clearance" },
      { label: "Template Checklist", href: "/hr/admin/clearance/config" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isHRAdmin = user?.role === "HR_ADMIN";
  const navGroups = isHRAdmin ? adminNavGroups : hrNavGroups;

  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    navGroups.filter(g => pathname.startsWith(g.basePath)).map(g => g.label)
  );

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const handleLogout = () => {
    logout();
    router.push("/hr/login");
  };

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo — consistent sizing per breakpoint */}
      <div className="px-4 pt-6 pb-4 shrink-0">
        {/* Desktop: compact row */}
        <div className="hidden lg:flex items-center gap-3">
          <LogoSvg width={36} height={36} />
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-800">HiFeed</h1>
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400">HR Presensi</p>
          </div>
        </div>
        {/* Mobile: centered logo mark only */}
        <div className="flex lg:hidden items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoSvg width={32} height={32} />
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-800">HiFeed</h1>
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400">HR Presensi</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Role Badge */}
      {user && (
        <div className="mx-4 mb-3 shrink-0">
          <div className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold",
            isHRAdmin
              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          )}>
            <Shield className="h-3.5 w-3.5 shrink-0" />
            <span>{isHRAdmin ? "Admin HR" : "Karyawan"}</span>
          </div>
        </div>
      )}

      {/* Nav — scrollable */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5 pb-2">
        {navGroups.map(group => {
          const isActive = pathname.startsWith(group.basePath);
          const isExpanded = expandedGroups.includes(group.label) || isActive;
          const Icon = group.icon;
          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isExpanded && "rotate-180")} />
              </button>
              <div className={cn(
                "overflow-hidden transition-all duration-200",
                isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              )}>
                <div className="ml-4 space-y-0.5 border-l border-slate-200 pl-4 pt-1 pb-1">
                  {group.items.map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "block rounded-md px-3 py-2 text-[13px] transition-all",
                        pathname === item.href
                          ? "bg-indigo-100 text-indigo-700 font-semibold shadow-sm"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer — always at bottom */}
      <div className="shrink-0 border-t border-slate-200 px-4 py-3 bg-white">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 shrink-0">
            {user?.name?.charAt(0) || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{user?.name || "Guest"}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.email || ""}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Hamburger — top left, safe from browser UI */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-md border border-slate-200 lg:hidden hover:bg-slate-50 active:bg-slate-100 transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-white border-r border-slate-200 shadow-xl transition-transform duration-300 ease-out lg:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-[260px] lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 bg-white border-r border-slate-200 shadow-sm">
        {sidebarContent}
      </aside>
    </>
  );
}