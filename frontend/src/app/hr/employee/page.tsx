"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, FlagBadge, LeaveStatusBadge } from "@/components/ui/stat-card";
import { LocationCell } from "@/components/ui/location-cell";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { AttendanceLog, LeaveBalance, LeaveRequest, AttendanceStats } from "@/lib/types";
import {
  Calendar, Clock, CheckCircle2, AlertCircle,
  TrendingUp, CalendarCheck, LogOut, Loader2,
  Camera, MapPin, RefreshCw,
} from "lucide-react";

function EmployeeDashboard() {
  const { user, logout } = useAuth();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceLog | null>(null);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClocking, setIsClocking] = useState(false);
  const [clockError, setClockError] = useState<string | null>(null);

  // Geolocation state
  const [geoLocation, setGeoLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [balancesData, todayData, requestsData, statsData] = await Promise.all([
        api.getLeaveBalances(),
        api.getTodayAttendance(),
        api.getLeaveRequests(),
        api.getPersonalStats(),
      ]);
      setBalances(balancesData);
      setTodayAttendance(todayData);
      setMyRequests(requestsData);
      setStats(statsData);
    } catch (err) {
      // 401/403 = not authenticated yet, silently skip (auth guard will redirect)
      if (err instanceof Error && (err.message.includes("401") || err.message.includes("Not authenticated"))) return;
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get geolocation
  const getGeoLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation tidak didukung browser ini");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoError(null);
      },
      (err) => setGeoError(`Lokasi: ${err.message}`)
    );
  }, []);

  useEffect(() => {
    getGeoLocation();
  }, [getGeoLocation]);

  const handleClockIn = async () => {
    if (!geoLocation) {
      getGeoLocation();
      return;
    }
    setIsClocking(true);
    setClockError(null);
    try {
      const idempotencyKey = crypto.randomUUID();
      const result = await api.clockIn({
        latitude: geoLocation.lat,
        longitude: geoLocation.lng,
        idempotency_key: idempotencyKey,
      });
      setTodayAttendance(result);
    } catch (err) {
      setClockError(err instanceof Error ? err.message : "Clock-in gagal");
    } finally {
      setIsClocking(false);
    }
  };

  const handleClockOut = async () => {
    if (!geoLocation) {
      getGeoLocation();
      return;
    }
    setIsClocking(true);
    setClockError(null);
    try {
      const idempotencyKey = crypto.randomUUID();
      const result = await api.clockOut({
        latitude: geoLocation.lat,
        longitude: geoLocation.lng,
        idempotency_key: idempotencyKey,
      });
      setTodayAttendance(result);
    } catch (err) {
      setClockError(err instanceof Error ? err.message : "Clock-out gagal");
    } finally {
      setIsClocking(false);
    }
  };

  if (!user) return null;

  const totalLeaveUsed = balances.reduce((acc, b) => acc + b.used, 0);
  const totalLeaveAvailable = balances.reduce((acc, b) => acc + b.available, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground mt-3">Memuat data...</p>
        </div>
      </div>
    );
  }

  const isClockInDisabled = !geoLocation || isClocking;
  const isClockOutDisabled = !geoLocation || isClocking;

  return (
    <div className="min-h-screen">
      <Header
        title={`Halo, ${user.name.split(" ")[0]}!`}
        subtitle="Selamat datang di dashboard karyawan"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className="text-destructive hover:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Keluar
        </Button>
      </Header>

      <div className="p-6 space-y-6">
        {/* Quick Actions - Clock In/Out */}
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Clock className="h-7 w-7 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Absensi Hari Ini</h3>
                  <p className="text-sm text-muted-foreground">
                    {todayAttendance ? (
                      <span className="text-emerald-600 font-medium">Sudah melakukan absensi</span>
                    ) : (
                      <span className="text-amber-600 font-medium">Belum absen masuk</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                {todayAttendance?.clockInTime && !todayAttendance?.clockOutTime && (
                  <Button
                    onClick={handleClockOut}
                    disabled={isClockOutDisabled}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isClocking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    {isClocking ? "Memproses..." : "Absen Pulang"}
                  </Button>
                )}
                {!todayAttendance?.clockInTime && (
                  <Button
                    onClick={handleClockIn}
                    disabled={isClockInDisabled}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {isClocking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
                    {isClocking ? "Memproses..." : "Absen Masuk"}
                  </Button>
                )}
                {todayAttendance?.clockOutTime && (
                  <Badge variant="success" className="text-sm px-4 py-2">
                    ✓ Hari ini selesai
                  </Badge>
                )}
              </div>
            </div>

            {clockError && (
              <div className="mt-3 p-2 rounded-lg bg-red-50 text-red-600 text-sm">
                {clockError}
              </div>
            )}

            {geoError && !todayAttendance && (
              <div className="mt-3 flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="h-4 w-4" />
                {geoError} —{" "}
                <button onClick={getGeoLocation} className="underline font-medium">
                  Coba lagi
                </button>
              </div>
            )}

            {todayAttendance && (
              <div className="mt-4 pt-4 border-t border-indigo-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Jam Masuk</p>
                  <p className="font-semibold">
                    {todayAttendance.clockInTime ? todayAttendance.clockInTime.toString().slice(0, 5) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Jam Pulang</p>
                  <p className="font-semibold">
                    {todayAttendance.clockOutTime ? todayAttendance.clockOutTime.toString().slice(0, 5) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <FlagBadge flag={todayAttendance.clockInFlag || "ABSENT_FLAG"} />
                </div>
                <div>
                  <p className="text-muted-foreground">Lokasi</p>
                  <LocationCell
                    latitude={todayAttendance.clockInLatitude}
                    longitude={todayAttendance.clockInLongitude}
                    locationName={todayAttendance.clockInLocationName}
                    showName={false}
                    className="mt-0.5"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Tingkat Kehadiran"
            value={stats ? `${stats.attendanceRate}%` : "—"}
            icon={<CalendarCheck className="h-5 w-5" />}
            variant={stats && stats.attendanceRate >= 80 ? "success" : "warning"}
          />
          <StatCard
            label="Tingkat Ketepatan"
            value={stats ? `${stats.onTimeRate}%` : "—"}
            sub="Bulan ini"
            icon={<TrendingUp className="h-5 w-5" />}
            variant={stats && stats.onTimeRate >= 70 ? "success" : "warning"}
          />
          <StatCard
            label="Total Cuti Digunakan"
            value={totalLeaveUsed}
            sub={`${totalLeaveAvailable} tersedia`}
            icon={<Calendar className="h-5 w-5" />}
          />
          <StatCard
            label="Keterlambatan"
            value={stats?.lateCountThisMonth ?? 0}
            sub="Bulan ini"
            icon={<AlertCircle className="h-5 w-5" />}
            variant={stats?.lateCountThisMonth === 0 ? "success" : stats && stats.lateCountThisMonth <= 2 ? "warning" : "destructive"}
          />
        </div>

        {/* Leave Balances & Recent Requests */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leave Balances */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Sisa Kuota Cuti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {balances.length > 0 ? (
                  balances.map((balance) => (
                    <div key={balance.leaveTypeId} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: balance.colorCode }}
                        />
                        <div>
                          <p className="font-medium">{balance.leaveTypeName}</p>
                          <p className="text-xs text-muted-foreground">
                            Kuota: {balance.totalQuota} {balance.quotaUnit === "DAYS" ? "hari" : "jam"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold" style={{ color: balance.colorCode }}>
                          {balance.available}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          terpakai: {balance.used}
                          {balance.pending > 0 && <span className="text-amber-500"> (pending: {balance.pending})</span>}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Belum ada data cuti</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Pengajuan Terakhir
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myRequests.length > 0 ? (
                <div className="space-y-4">
                  {myRequests.slice(0, 4).map((request) => (
                    <div key={request.id} className="p-3 rounded-lg bg-muted/30 border border-transparent hover:border-primary/10 transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{request.leaveTypeName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(request.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} - {new Date(request.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                          <p className="text-xs text-muted-foreground">{request.daysRequested} hari</p>
                        </div>
                        <LeaveStatusBadge status={request.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Belum ada pengajuan</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Karyawan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Nama Lengkap</p>
                <p className="font-medium">{user.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Departemen</p>
                <p className="font-medium">{user.department || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tanggal Bergabung</p>
                <p className="font-medium">
                  {user.joinDate
                    ? new Date(user.joinDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function EmployeePage() {
  return <EmployeeDashboard />;
}