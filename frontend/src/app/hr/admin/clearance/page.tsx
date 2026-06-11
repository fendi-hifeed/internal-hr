"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import type {
  Resignation, ResignationDetail, ClearanceItem,
  ClearanceDashboardStats, User,
} from "@/lib/types";
import { CATEGORY_LABELS as CAT_LABELS, STATUS_LABELS, ITEM_STATUS_LABELS as ITEM_LABELS } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  UserCheck, Clock, CheckCircle2, XCircle, AlertCircle,
  Plus, ChevronRight, Loader2, Search, X, Eye,
  Calendar, UserX, CheckSquare, ClipboardList, UserPlus,
  ArrowRight, Ban,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
  CLEARED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-slate-100 text-slate-600 border-slate-200",
};

const CAT_COLORS: Record<string, string> = {
  IT_EQUIPMENT: "bg-purple-100 text-purple-700",
  DOCUMENTS: "bg-blue-100 text-blue-700",
  FINANCE: "bg-green-100 text-green-700",
  FACILITIES: "bg-orange-100 text-orange-700",
  HR_ADMIN: "bg-pink-100 text-pink-700",
  SUPERVISOR: "bg-indigo-100 text-indigo-700",
  OTHER: "bg-slate-100 text-slate-600",
};

function ProgressBar({ value, total }: { value: number; total: number }) {
  if (total === 0) return null;
  const pct = Math.round((value / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-500 min-w-[36px] text-right">
        {value}/{total} ({pct}%)
      </span>
    </div>
  );
}

export default function ClearancePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<ClearanceDashboardStats | null>(null);
  const [resignations, setResignations] = useState<Resignation[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Detail modal
  const [selectedResignation, setSelectedResignation] = useState<ResignationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Initiate modal
  const [showInitiate, setShowInitiate] = useState(false);
  const [initForm, setInitForm] = useState({
    employeeId: "",
    resignationDate: "",
    lastWorkDate: "",
    reason: "",
  });
  const [initSubmitting, setInitSubmitting] = useState(false);
  const [initError, setInitError] = useState("");

  useEffect(() => {
    if (!authLoading && user?.role !== "HR_ADMIN") {
      router.replace("/hr");
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, resData, empData] = await Promise.all([
        api.getClearanceStats(),
        api.getResignations(statusFilter as any),
        api.getEmployees(),
      ]);
      setStats(statsData);
      setResignations(resData);
      setEmployees(empData);
    } catch (error) {
      if (error instanceof Error && (error.message.includes("401") || error.message.includes("Not authenticated"))) return;
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setSelectedResignation(null);
    try {
      const data = await api.getResignation(id);
      setSelectedResignation(data);
    } catch (error) {
      console.error("Failed to fetch resignation detail:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleInitiate = async () => {
    if (!initForm.employeeId || !initForm.resignationDate || !initForm.lastWorkDate) {
      setInitError("Lengkapi semua field wajib.");
      return;
    }
    setInitSubmitting(true);
    setInitError("");
    try {
      await api.createResignation({
        employeeId: initForm.employeeId,
        resignationDate: new Date(initForm.resignationDate).toISOString(),
        lastWorkDate: new Date(initForm.lastWorkDate).toISOString(),
        reason: initForm.reason,
      });
      setShowInitiate(false);
      setInitForm({ employeeId: "", resignationDate: "", lastWorkDate: "", reason: "" });
      fetchData();
    } catch (error) {
      setInitError(error instanceof Error ? error.message : "Gagal memulai proses.");
    } finally {
      setInitSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.approveResignation(id, "Disetujui oleh HR Admin");
      fetchData();
      if (selectedResignation?.id === id) openDetail(id);
    } catch (error) {
      console.error("Failed to approve:", error);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await api.completeResignation(id);
      fetchData();
      if (selectedResignation?.id === id) openDetail(id);
    } catch (error) {
      console.error("Failed to complete:", error);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Batalkan proses resignasi ini?")) return;
    try {
      await api.cancelResignation(id, "Dibatalkan oleh HR Admin");
      fetchData();
      if (selectedResignation?.id === id) setSelectedResignation(null);
    } catch (error) {
      console.error("Failed to cancel:", error);
    }
  };

  const handleItemToggle = async (resId: string, item: ClearanceItem) => {
    try {
      const newStatus = item.status === "PENDING" ? "COMPLETED" : "PENDING";
      await api.completeClearanceItem(resId, item.id, { waive: false });
      // Refresh detail
      const data = await api.getResignation(resId);
      setSelectedResignation(data);
      fetchData();
    } catch (error) {
      console.error("Failed to toggle item:", error);
    }
  };

  const handleItemWaive = async (resId: string, item: ClearanceItem) => {
    try {
      await api.completeClearanceItem(resId, item.id, { waive: true });
      const data = await api.getResignation(resId);
      setSelectedResignation(data);
      fetchData();
    } catch (error) {
      console.error("Failed to waive item:", error);
    }
  };

  const filtered = resignations.filter(r =>
    (r.employeeName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.reason || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clearance & Resignasi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Kelola proses keluar karyawan</p>
        </div>
        <Button onClick={() => setShowInitiate(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Initiate Resignasi
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Pending", value: stats?.pendingInitiations ?? 0, icon: Clock, color: "text-yellow-600 bg-yellow-50", border: "border-yellow-200" },
          { label: "Sedang Clearance", value: stats?.inProgress ?? 0, icon: ClipboardList, color: "text-blue-600 bg-blue-50", border: "border-blue-200" },
          { label: "Selesai Bulan Ini", value: stats?.clearedThisMonth ?? 0, icon: CheckCircle2, color: "text-green-600 bg-green-50", border: "border-green-200" },
          { label: "Total Aktif", value: stats?.totalActiveResignations ?? 0, icon: UserCheck, color: "text-indigo-600 bg-indigo-50", border: "border-indigo-200" },
        ].map(({ label, value, icon: Icon, color, border }) => (
          <Card key={label} className={`border ${border}`}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-slate-800">{value}</p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
                </div>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari nama atau alasan..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {["", "PENDING", "IN_PROGRESS", "CLEARED", "CANCELLED"].map(s => (
            <Button
              key={s || "all"}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
            >
              {s === "" ? "Semua" : STATUS_LABELS[s as keyof typeof STATUS_LABELS] || s}
            </Button>
          ))}
        </div>
      </div>

      {/* Resignations List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Resignasi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <UserX className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Belum ada data resignasi</p>
              <p className="text-xs mt-1">Klik "Initiate Resignasi" untuk memulai</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(r => (
                <div key={r.id} className="px-6 py-4 hover:bg-slate-50 transition-colors flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800">{r.employeeName || "Unknown"}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] || ""}`}>
                        {r.status === "PENDING" && <Clock className="h-3 w-3" />}
                        {r.status === "IN_PROGRESS" && <ClipboardList className="h-3 w-3" />}
                        {r.status === "CLEARED" && <CheckCircle2 className="h-3 w-3" />}
                        {r.status === "CANCELLED" && <XCircle className="h-3 w-3" />}
                        {STATUS_LABELS[r.status as keyof typeof STATUS_LABELS] || r.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Ajukan: {new Date(r.resignationDate).toLocaleDateString("id-ID")}
                      </span>
                      <span>Last work: {new Date(r.lastWorkDate).toLocaleDateString("id-ID")}</span>
                      <span>By: {r.initiatorName}</span>
                    </div>
                    {r.reason && (
                      <p className="text-xs text-slate-400 mt-1 truncate">{r.reason}</p>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="w-48 shrink-0 hidden md:block">
                    <ProgressBar value={r.completedItems} total={r.totalItems} />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {r.status === "PENDING" && (
                      <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => handleApprove(r.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve
                      </Button>
                    )}
                    {r.status !== "CLEARED" && r.status !== "CANCELLED" && (
                      <Button size="sm" variant="ghost" className="text-slate-400 hover:text-red-600"
                        onClick={() => handleCancel(r.id)}>
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openDetail(r.id)}>
                      <Eye className="h-3.5 w-3.5 mr-1" />Detail
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedResignation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Clearance — {selectedResignation.employeeName}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[selectedResignation.status]}`}>
                    {STATUS_LABELS[selectedResignation.status as keyof typeof STATUS_LABELS]}
                  </span>
                  <span className="text-xs text-slate-500">
                    Last work: {new Date(selectedResignation.lastWorkDate).toLocaleDateString("id-ID")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedResignation.status === "PENDING" && (
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleApprove(selectedResignation.id)}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve
                  </Button>
                )}
                {selectedResignation.status === "IN_PROGRESS" && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleComplete(selectedResignation.id)}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Selesaikan
                  </Button>
                )}
                {selectedResignation.status !== "CLEARED" && selectedResignation.status !== "CANCELLED" && (
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleCancel(selectedResignation.id)}>
                    <XCircle className="h-3.5 w-3.5 mr-1" />Batal
                  </Button>
                )}
                <button onClick={() => setSelectedResignation(null)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Tanggal Ajuan</p>
                  <p className="font-semibold">{new Date(selectedResignation.resignationDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Last Work Day</p>
                  <p className="font-semibold">{new Date(selectedResignation.lastWorkDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Progress</p>
                  <p className="font-semibold">{selectedResignation.completedItems}/{selectedResignation.totalItems} item</p>
                </div>
              </div>

              {selectedResignation.reason && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                  <p className="text-xs text-yellow-700 font-medium mb-1">Alasan</p>
                  <p className="text-yellow-800">{selectedResignation.reason}</p>
                </div>
              )}

              {/* Checklist */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Checklist Clearance ({selectedResignation.clearanceItems.length} item)
                </h3>
                <div className="space-y-2">
                  {selectedResignation.clearanceItems.map(item => (
                    <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors">
                      <button
                        onClick={() => handleItemToggle(selectedResignation.id, item)}
                        disabled={selectedResignation.status !== "IN_PROGRESS"}
                        className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          item.status === "COMPLETED" || item.status === "WAIVED"
                            ? "bg-green-500 border-green-500"
                            : "border-slate-300 hover:border-indigo-400"
                        } ${selectedResignation.status !== "IN_PROGRESS" ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                      >
                        {(item.status === "COMPLETED" || item.status === "WAIVED") && (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-medium ${item.status !== "PENDING" ? "line-through text-slate-400" : "text-slate-700"}`}>
                            {item.itemName}
                          </p>
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${CAT_COLORS[item.itemCategory] || "bg-slate-100 text-slate-600"}`}>
                            {CAT_LABELS[item.itemCategory as keyof typeof CAT_LABELS] || item.itemCategory}
                          </span>
                          {item.requiresProof && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                              <AlertCircle className="h-2.5 w-2.5" /> perlu bukti
                            </span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-xs text-slate-500 mt-0.5">{item.notes}</p>
                        )}
                        {item.completedAt && (
                          <p className="text-xs text-green-600 mt-0.5">
                            {item.completedBy ? `By ${item.completerName}` : ""} — {new Date(item.completedAt).toLocaleString("id-ID")}
                          </p>
                        )}
                      </div>
                      {item.status === "PENDING" && selectedResignation.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => handleItemWaive(selectedResignation.id, item)}
                          className="text-xs text-slate-400 hover:text-yellow-600 shrink-0"
                          title="Waive item"
                        >
                          Waive
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Initiate Modal */}
      {showInitiate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-800">Initiate Resignasi</h2>
              <button onClick={() => setShowInitiate(false)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {initError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 inline mr-1" />{initError}
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Karyawan *</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={initForm.employeeId}
                  onChange={e => setInitForm(f => ({ ...f, employeeId: e.target.value }))}
                >
                  <option value="">Pilih karyawan...</option>
                  {employees.filter(e => e.isActive && e.role !== "HR_ADMIN").map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.department})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Tanggal Ajuan *</label>
                  <Input type="date" value={initForm.resignationDate}
                    onChange={e => setInitForm(f => ({ ...f, resignationDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Last Work Date *</label>
                  <Input type="date" value={initForm.lastWorkDate}
                    onChange={e => setInitForm(f => ({ ...f, lastWorkDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Alasan (opsional)</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={3}
                  value={initForm.reason}
                  onChange={e => setInitForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Alasan resignasi..."
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                Checklist clearance akan digenerate otomatis dari template yang sudah di-setup di menu "Template Checklist".
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowInitiate(false)}>Batal</Button>
                <Button onClick={handleInitiate} disabled={initSubmitting} className="gap-2">
                  {initSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Initiate
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}