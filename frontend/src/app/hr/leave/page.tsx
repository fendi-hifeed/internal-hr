"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import type { LeaveBalance, LeaveRequest } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LeaveStatusBadge } from "@/components/ui/stat-card";
import { Calendar, Plus, Clock, FileText } from "lucide-react";
import Link from "next/link";

export default function LeavePage() {
  const { user } = useAuth();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const [bal, req] = await Promise.all([
          api.getLeaveBalances(user.id),
          api.getLeaveRequests(user.id),
        ]);
        setBalances(bal);
        setRequests(req);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cuti & Izin</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola jatah cuti dan ajukan permohonan cuti
          </p>
        </div>
        <Link href="/hr/leave/request">
          <Button>
            <Plus className="h-4 w-4" />
            Ajukan Cuti
          </Button>
        </Link>
      </div>

      {/* Balance Cards with Progress Bars */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Saldo Cuti</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {balances.map((balance) => {
            const usedPercent = balance.totalQuota > 0
              ? Math.round((balance.used / balance.totalQuota) * 100)
              : 0;
            const pendingPercent = balance.totalQuota > 0
              ? Math.round((balance.pending / balance.totalQuota) * 100)
              : 0;

            return (
              <Card key={balance.leaveTypeId} className="overflow-hidden">
                <div
                  className="h-1.5"
                  style={{ backgroundColor: balance.colorCode }}
                />
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: balance.colorCode }}
                    />
                    <span className="text-sm font-medium">
                      {balance.leaveTypeName}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tersedia</span>
                      <span className="font-bold text-lg">
                        {balance.available}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          {balance.quotaUnit.toLowerCase()}
                        </span>
                      </span>
                    </div>
                    <Progress
                      value={usedPercent}
                      className="h-2"
                      style={
                        {
                          "--progress-used": balance.colorCode,
                        } as React.CSSProperties
                      }
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Terpakai: {balance.used}</span>
                      <span>Total: {balance.totalQuota}</span>
                    </div>
                    {balance.pending > 0 && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                        <Clock className="h-3 w-3" />
                        {balance.pending} {balance.quotaUnit.toLowerCase()} menunggu persetujuan
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Request History */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Riwayat Permohonan</h2>
        {requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Belum ada permohonan cuti</p>
              <Link href="/hr/leave/request" className="mt-4 inline-block">
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Ajukan Cuti Pertama
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <Card key={req.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: req.colorCode }}
                        />
                        <span className="font-medium">{req.leaveTypeName}</span>
                        <LeaveStatusBadge status={req.status} />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(req.startDate)} - {formatDate(req.endDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {req.daysRequested} {req.daysRequested === 1 ? "hari" : "hari"}
                          {req.halfDay && " (setengah hari)"}
                        </span>
                      </div>
                      {req.reason && (
                        <div className="flex items-start gap-1.5 mt-2 text-sm text-muted-foreground">
                          <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{req.reason}</span>
                        </div>
                      )}
                      {req.currentApproverName && (req.status === "PENDING" || req.status === "APPROVED_L1") && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Menunggu persetujuan: <span className="font-medium">{req.currentApproverName}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}