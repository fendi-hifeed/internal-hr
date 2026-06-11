"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { attendanceLogs } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import type { AttendanceLog, FlagStatus } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock, MapPin, ChevronLeft, ChevronRight, User,
  Calendar, TrendingUp, AlertCircle, CheckCircle
} from "lucide-react";
import { LocationCell } from "@/components/ui/location-cell";

const ITEMS_PER_PAGE = 10;

function getFlagBadgeVariant(flag?: FlagStatus) {
  switch (flag) {
    case "ON_TIME":
      return { variant: "success" as const, label: "On Time" };
    case "LATE":
      return { variant: "warning" as const, label: "Late" };
    case "VERY_LATE":
      return { variant: "destructive" as const, label: "Very Late" };
    default:
      return { variant: "secondary" as const, label: "-" };
  }
}

export default function AttendanceHistoryPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadHistory();
  }, [page]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const empId = user?.id || "e1"; // Fallback to e1 for demo
      const result = await api.getAttendanceHistory(empId, page, ITEMS_PER_PAGE);
      setLogs(result.logs);
      setTotal(result.total);
    } catch (err) {
      // 401/403 = not authenticated yet, silently skip
      if (err instanceof Error && (err.message.includes("401") || err.message.includes("Not authenticated"))) return;
      console.error("Failed to load attendance history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Stats calculations
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const onTimeCount = logs.filter((l) => l.clockInFlag === "ON_TIME").length;
  const lateCount = logs.filter(
    (l) => l.clockInFlag === "LATE" || l.clockInFlag === "VERY_LATE"
  ).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Riwayat Kehadiran</h1>
          <p className="text-sm text-muted-foreground">
            {user?.name || "Employee"} • {attendanceLogs.filter((l) => l.employeeId === (user?.id || "e1")).length} total record
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(new Date())}</span>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{logs.length}</p>
                <p className="text-xs text-muted-foreground">Total Halaman</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{onTimeCount}</p>
                <p className="text-xs text-muted-foreground">On Time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lateCount}</p>
                <p className="text-xs text-muted-foreground">Late / Very Late</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {logs.length > 0 ? Math.round((onTimeCount / logs.length) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">On Time Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Daftar Kehadiran
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Belum ada data kehadiran</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="grid grid-cols-6 gap-4 px-6 py-3 bg-muted/50 text-sm font-medium text-muted-foreground border-b">
                <div className="col-span-1">Tanggal</div>
                <div className="col-span-1">Clock In</div>
                <div className="col-span-1">Clock Out</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-2">Lokasi</div>
              </div>

              {/* Table Rows */}
              <div className="divide-y">
                {logs.map((log) => {
                  const flag = getFlagBadgeVariant(log.clockInFlag);
                  return (
                    <div
                      key={log.id}
                      className="grid grid-cols-6 gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="col-span-1">
                        <p className="font-medium">{formatDate(log.date)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.date).toLocaleDateString("id-ID", {
                            weekday: "short",
                          })}
                        </p>
                      </div>

                      <div className="col-span-1">
                        {log.clockInTime ? (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono">{log.clockInTime.slice(0, 5)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>

                      <div className="col-span-1">
                        {log.clockOutTime ? (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono">{log.clockOutTime.slice(0, 5)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>

                      <div className="col-span-1">
                        <Badge variant={flag.variant}>{flag.label}</Badge>
                      </div>

                      <div className="col-span-2">
                        <LocationCell
                          latitude={log.clockInLatitude}
                          longitude={log.clockInLongitude}
                          locationName={log.clockInLocationName}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Halaman {page} dari {totalPages} • Total {total} record
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
