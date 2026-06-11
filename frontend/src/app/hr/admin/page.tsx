"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import type { AdminDashboardStats, AttendanceLog, LeaveRequest, ClearanceDashboardStats } from "@/lib/types";
import { StatCard, FlagBadge, LeaveStatusBadge } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, Clock, AlertTriangle, CalendarCheck, TrendingUp,
  CheckCircle2, XCircle, ArrowRight, RefreshCw, Loader2, UserCheck, ClipboardList,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [clearanceStats, setClearanceStats] = useState<ClearanceDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user?.role !== "HR_ADMIN") {
      router.replace("/hr");
    }
  }, [user, authLoading, router]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [statsData, pendingData, clearanceData] = await Promise.all([
        api.getAdminStats(),
        api.getPendingLeaveRequests(),
        api.getClearanceStats(),
      ]);
      setStats(statsData);
      setPendingRequests(pendingData);
      setClearanceStats(clearanceData);
    } catch (error) {
      // 401/403 = not authenticated yet, silently skip (auth guard will redirect)
      if (error instanceof Error && error.message.includes("401")) return;
      console.error("Failed to fetch admin data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (requestId: string, version: number) => {
    setProcessingId(requestId);
    try {
      const updated = await api.approveLeave(requestId, version);
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal approve");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string, version: number) => {
    setProcessingId(requestId);
    try {
      await api.rejectLeave(requestId, version);
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal reject");
    } finally {
      setProcessingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  if (user?.role !== "HR_ADMIN") {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Admin HR</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ringkasan kehadiran dan persetujuan cuti hari ini
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Karyawan"
          value={stats?.totalEmployees ?? 0}
          icon={<Users className="h-5 w-5" />}
          variant="default"
        />
        <StatCard
          label="Hadir Hari Ini"
          value={stats?.presentToday ?? 0}
          sub={` dari ${stats?.totalEmployees ?? 0} karyawan`}
          icon={<Clock className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          label="Terlambat Hari Ini"
          value={stats?.lateToday ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant="warning"
        />
        <StatCard
          label="Cuti Hari Ini"
          value={stats?.onLeaveToday ?? 0}
          icon={<CalendarCheck className="h-5 w-5" />}
          variant="default"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Tingkat Kehadiran"
          value={`${stats?.attendanceRate?.toFixed(1) ?? 0}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          label="Tingkat Tepat Waktu"
          value={`${stats?.onTimeRate?.toFixed(1) ?? 0}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          variant="default"
        />
        <StatCard
          label="Pending Approvals"
          value={stats?.pendingLeaveRequests ?? 0}
          icon={<XCircle className="h-5 w-5" />}
          variant="destructive"
        />
      </div>

      {/* Clearance Stats */}
      {(clearanceStats?.totalActiveResignations ?? 0) > 0 && (
        <Card className="border-indigo-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-indigo-500" />
              Clearance & Resignasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                <div className="h-10 w-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{clearanceStats?.pendingInitiations ?? 0}</p>
                  <p className="text-xs text-slate-500">Pending</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{clearanceStats?.inProgress ?? 0}</p>
                  <p className="text-xs text-slate-500">Sedang Clearance</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{clearanceStats?.clearedThisMonth ?? 0}</p>
                  <p className="text-xs text-slate-500">Selesai Bulan Ini</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{clearanceStats?.totalActiveResignations ?? 0}</p>
                  <p className="text-xs text-slate-500">Total Aktif</p>
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="outline" className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                onClick={() => router.push("/hr/admin/clearance")}>
                Kelola Clearance <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Attendance - overview from stats */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Kehadiran Hari Ini
              </CardTitle>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">{stats?.presentToday ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Hadir</p>
                </div>
                <div className="text-center border-x">
                  <p className="text-2xl font-bold text-amber-600">{stats?.lateToday ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Terlambat</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-600">
                    {(stats?.totalEmployees ?? 0) - (stats?.presentToday ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Belum Absen</p>
                </div>
              </div>
              <div className="text-center py-2 text-sm text-muted-foreground">
                Total karyawan: {stats?.totalEmployees ?? 0} · Tingkat kehadiran: {stats?.attendanceRate ?? 0}%
              </div>
            </div>
            <div className="mt-4 pt-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => router.push("/hr/attendance/history")}
              >
                Lihat Semua Riwayat
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending Leave Approvals */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarCheck className="h-4 w-4" />
                Permintaan Cuti Pending
              </CardTitle>
              <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                {pendingRequests.length} pending
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.length > 0 ? (
                pendingRequests.slice(0, 4).map((request) => (
                  <div
                    key={request.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
                      style={{ backgroundColor: request.colorCode || "#6B7280" }}
                    >
                      {(request.employeeName || "?").charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{request.employeeName || "Karyawan"}</p>
                        <LeaveStatusBadge status={request.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {request.leaveTypeName} · {request.daysRequested} hari
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} - {new Date(request.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        disabled={processingId === request.id}
                        onClick={() => handleApprove(request.id, 1)}
                        title="Approve"
                      >
                        {processingId === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={processingId === request.id}
                        onClick={() => handleReject(request.id, 1)}
                        title="Reject"
                      >
                        {processingId === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Tidak ada permintaan cuti pending</p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => router.push("/hr/admin/leave-approvals")}
              >
                Lihat Semua Approval
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2"
          onClick={() => router.push("/hr/admin/employees")}
        >
          <Users className="h-5 w-5" />
          <span className="font-medium">Kelola Karyawan</span>
          <span className="text-xs text-muted-foreground">Tambah, edit, atau nonaktifkan karyawan</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2"
          onClick={() => router.push("/hr/admin/leave-approvals")}
        >
          <CalendarCheck className="h-5 w-5" />
          <span className="font-medium">Approval Cuti</span>
          <span className="text-xs text-muted-foreground">Proses permintaan cuti karyawan</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2"
          onClick={() => router.push("/hr/admin/leave-types")}
        >
          <TrendingUp className="h-5 w-5" />
          <span className="font-medium">Tipe Cuti</span>
          <span className="text-xs text-muted-foreground">Konfigurasi tipe cuti</span>
        </Button>
      </div>
    </div>
  );
}