"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import type { LeaveRequest } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LeaveStatusBadge } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  User,
  FileText,
  Loader2,
} from "lucide-react";

type FilterStatus = "ALL" | "PENDING" | "APPROVED_L1";

export default function LeaveApprovalsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await api.getAllLeaveRequests();
        setRequests(data);
      } catch (err) {
        // 401/403 = not authenticated yet, silently skip
        if (err instanceof Error && (err.message.includes("401") || err.message.includes("Not authenticated"))) return;
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredRequests = requests.filter((req) => {
    if (filterStatus === "ALL") {
      return req.status === "PENDING" || req.status === "APPROVED_L1";
    }
    return req.status === filterStatus;
  });

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await api.approveLeave(requestId);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? {
                ...r,
                status: r.status === "PENDING" ? "APPROVED_L1" : "APPROVED",
                approvalHistory: r.approvalHistory.map((h, idx) =>
                  idx === 0 ? { ...h, status: "APPROVED" as const, actionAt: new Date().toISOString() } : h
                ),
              }
            : r
        )
      );
    } catch (error) {
      console.error("Failed to approve:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await api.rejectLeave(requestId);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? {
                ...r,
                status: "REJECTED" as const,
                approvalHistory: r.approvalHistory.map((h, idx) =>
                  idx === 0 ? { ...h, status: "REJECTED" as const, actionAt: new Date().toISOString() } : h
                ),
              }
            : r
        )
      );
    } catch (error) {
      console.error("Failed to reject:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pendingCount = requests.filter(
    (r) => r.status === "PENDING" || r.status === "APPROVED_L1"
  ).length;

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-12 bg-muted rounded" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Persetujuan Cuti</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola dan setujui permohonan cuti karyawan
          </p>
        </div>
        <Badge variant="warning" className="text-sm px-3 py-1">
          <Clock className="h-4 w-4 mr-1" />
          {pendingCount} menunggu persetujuan
        </Badge>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b pb-3">
        {(["ALL", "PENDING", "APPROVED_L1"] as FilterStatus[]).map((status) => (
          <Button
            key={status}
            variant={filterStatus === status ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilterStatus(status)}
          >
            {status === "ALL" ? "Semua" : status === "PENDING" ? "Pending" : "Approved L1"}
          </Button>
        ))}
      </div>

      {/* Table */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Tidak ada permohonan cuti</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isExpanded = expandedId === req.id;
            const canApprove =
              req.status === "PENDING" || req.status === "APPROVED_L1";
            const currentLevel = req.approvalHistory.find(
              (h) => h.status === "PENDING"
            );

            return (
              <Card key={req.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Main Row */}
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Left: Info */}
                      <div className="flex-1 space-y-3">
                        {/* Employee & Leave Type */}
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: req.colorCode }}
                          />
                          <div>
                            <p className="font-semibold">{req.employeeName}</p>
                            <p className="text-sm text-muted-foreground">
                              {req.leaveTypeName}
                            </p>
                          </div>
                          <LeaveStatusBadge status={req.status} />
                        </div>

                        {/* Dates & Days */}
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDate(req.startDate)} - {formatDate(req.endDate)}
                          </span>
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {req.daysRequested} hari
                            {req.halfDay && " (setengah hari)"}
                          </span>
                        </div>

                        {/* Reason */}
                        {req.reason && (
                          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                            <FileText className="h-4 w-4 shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{req.reason}</span>
                          </div>
                        )}

                        {/* Current Approver */}
                        {req.currentApproverName && canApprove && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Penanggung jawab saat ini:
                            </span>
                            <span className="font-medium">
                              {req.currentApproverName}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col items-end gap-2">
                        {canApprove ? (
                          <div className="flex gap-2">
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => handleApprove(req.id)}
                              disabled={processingId === req.id}
                            >
                              {processingId === req.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                              Setujui
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleReject(req.id)}
                              disabled={processingId === req.id}
                            >
                              {processingId === req.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                              Tolak
                            </Button>
                          </div>
                        ) : (
                          <LeaveStatusBadge status={req.status} />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : req.id)
                          }
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Sembunyikan
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Riwayat
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded: Approval History */}
                  {isExpanded && (
                    <div className="border-t bg-muted/30 p-4">
                      <h4 className="text-sm font-semibold mb-3">
                        Riwayat Persetujuan
                      </h4>
                      <div className="space-y-3">
                        {req.approvalHistory.map((history, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 text-sm"
                          >
                            <div className="flex flex-col items-center">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  history.status === "APPROVED"
                                    ? "bg-emerald-100 text-emerald-600"
                                    : history.status === "REJECTED"
                                    ? "bg-red-100 text-red-600"
                                    : "bg-amber-100 text-amber-600"
                                }`}
                              >
                                {history.status === "APPROVED" ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : history.status === "REJECTED" ? (
                                  <XCircle className="h-4 w-4" />
                                ) : (
                                  <Clock className="h-4 w-4" />
                                )}
                              </div>
                              {idx < req.approvalHistory.length - 1 && (
                                <div className="w-0.5 h-6 bg-border mt-1" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {history.approverName}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  Level {history.level}
                                </Badge>
                                <Badge
                                  variant={
                                    history.status === "APPROVED"
                                      ? "success"
                                      : history.status === "REJECTED"
                                      ? "destructive"
                                      : "warning"
                                  }
                                  className="text-xs"
                                >
                                  {history.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {history.approverRole}
                              </p>
                              {history.actionAt && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDateTime(history.actionAt)}
                                </p>
                              )}
                              {history.notes && (
                                <p className="text-sm mt-1 italic">
                                  "{history.notes}"
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
