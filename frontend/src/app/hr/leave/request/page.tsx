"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import type { LeaveType, LeaveBalance } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Calendar, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";

interface FormData {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  halfDayType: "MORNING" | "AFTERNOON";
  reason: string;
}

export default function LeaveRequestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState<FormData>({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    halfDay: false,
    halfDayType: "MORNING",
    reason: "",
  });

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const [types, bals] = await Promise.all([
          api.getLeaveTypes(),
          api.getLeaveBalances(user.id),
        ]);
        setLeaveTypes(types.filter((t) => t.isActive));
        setBalances(bals);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const selectedLeaveType = leaveTypes.find((t) => t.id === form.leaveTypeId);
  const selectedBalance = balances.find((b) => b.leaveTypeId === form.leaveTypeId);

  const calculateDays = () => {
    if (!form.startDate || !form.endDate) return 0;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (end < start) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return form.halfDay ? 0.5 : diffDays;
  };

  const validateForm = (): string | null => {
    if (!form.leaveTypeId) return "Pilih jenis cuti";
    if (!form.startDate) return "Pilih tanggal mulai";
    if (!form.endDate) return "Pilih tanggal selesai";
    if (new Date(form.endDate) < new Date(form.startDate)) {
      return "Tanggal selesai harus setelah tanggal mulai";
    }
    const days = calculateDays();
    if (days <= 0) return "Durasi cuti tidak valid";
    if (selectedBalance && days > selectedBalance.available) {
      return `Sisa quota ${selectedBalance.leaveTypeName} tidak mencukupi`;
    }
    if (selectedLeaveType?.requiresAttachment && !form.reason) {
      return "Keterangan diperlukan untuk jenis cuti ini";
    }
    if (!form.reason) return "Keterangan diperlukan";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.requestLeave({
        employeeId: user.id,
        employeeName: user.name,
        leaveTypeId: form.leaveTypeId,
        leaveTypeName: selectedLeaveType?.typeName || "",
        leaveTypeCode: selectedLeaveType?.typeCode || "",
        colorCode: selectedLeaveType?.colorCode || "#3B82F6",
        startDate: form.startDate,
        endDate: form.endDate,
        daysRequested: calculateDays(),
        reason: form.reason,
        halfDay: form.halfDay,
        halfDayType: form.halfDay ? form.halfDayType : undefined,
        currentApproverId: user.supervisorId,
        currentApproverName: user.supervisorName,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/hr/leave");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengajukan cuti");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-96 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 mx-auto text-emerald-500 mb-4" />
            <h2 className="text-xl font-bold text-emerald-700 mb-2">
              Permohonan Berhasil Diajukan
            </h2>
            <p className="text-emerald-600">
              Permohonan cuti Anda sedang menunggu persetujuan.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/hr/leave"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
        <h1 className="text-2xl font-bold">Ajukan Permohonan Cuti</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ajukan permohonan cuti atau izin baru
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jenis Cuti</CardTitle>
            <CardDescription>Pilih jenis cuti yang akan diajukan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={form.leaveTypeId}
              onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
              required
            >
              <option value="">-- Pilih Jenis Cuti --</option>
              {leaveTypes.map((type) => {
                const balance = balances.find((b) => b.leaveTypeId === type.id);
                const available = balance?.available ?? type.defaultQuota;
                return (
                  <option key={type.id} value={type.id}>
                    {type.typeName} ({type.typeCode}) - {available} {type.quotaUnit.toLowerCase()} tersedia
                  </option>
                );
              })}
            </Select>

            {selectedLeaveType && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedLeaveType.colorCode }}
                  />
                  <span className="font-medium">{selectedLeaveType.typeName}</span>
                </div>
                <p className="text-muted-foreground">{selectedLeaveType.description}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                  <span>Quota: {selectedLeaveType.defaultQuota} {selectedLeaveType.quotaUnit.toLowerCase()}</span>
                  <span>Persetujuan: {selectedLeaveType.approvalLevel}</span>
                  <span>Minimum {selectedLeaveType.minNoticeDays} hari sebelumnya</span>
                </div>
                {selectedLeaveType.requiresAttachment && (
                  <div className="flex items-center gap-1 text-amber-600 mt-2">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span className="text-xs">Membutuhkan lampiran (surat dokter, dll)</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tanggal Cuti</CardTitle>
            <CardDescription>Tentukan periode cuti yang diajukan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tanggal Mulai</label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tanggal Selesai</label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  min={form.startDate || new Date().toISOString().split("T")[0]}
                  required
                />
              </div>
            </div>

            {/* Half-day toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Cuti Setengah Hari</p>
                <p className="text-xs text-muted-foreground">
                  Aktifkan jika hanya mengambil setengah hari
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.halfDay}
                onClick={() => setForm({ ...form, halfDay: !form.halfDay })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.halfDay ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.halfDay ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {form.halfDay && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Pilih Sesi</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, halfDayType: "MORNING" })}
                    className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${
                      form.halfDayType === "MORNING"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-muted"
                    }`}
                  >
                    <Calendar className="h-4 w-4 mx-auto mb-1" />
                    Pagi (08:00 - 12:00)
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, halfDayType: "AFTERNOON" })}
                    className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${
                      form.halfDayType === "AFTERNOON"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-muted"
                    }`}
                  >
                    <Calendar className="h-4 w-4 mx-auto mb-1" />
                    Sore (13:00 - 17:00)
                  </button>
                </div>
              </div>
            )}

            {form.startDate && form.endDate && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 text-sm">
                <Calendar className="h-4 w-4 text-primary" />
                <span>
                  Durasi: <span className="font-semibold">{calculateDays()}</span>{" "}
                  {calculateDays() === 1 ? "hari" : "hari"}
                </span>
                {selectedBalance && (
                  <span className="text-muted-foreground">
                    (Sisa quota: {selectedBalance.available})
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Keterangan</CardTitle>
            <CardDescription>
              Jelaskan alasan permohonan cuti Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Contoh: Liburan keluarga ke Yogyakarta..."
              rows={4}
              required
            />
            {selectedLeaveType?.requiresAttachment && (
              <p className="text-xs text-amber-600 mt-2">
                * Jenis cuti ini memerlukan lampiran. Harap sertakan dokumen pendukung saat mengumpulkan.
              </p>
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/hr/leave")}
            className="flex-1"
          >
            Batal
          </Button>
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? "Mengirim..." : "Ajukan Permohonan"}
          </Button>
        </div>
      </form>
    </div>
  );
}