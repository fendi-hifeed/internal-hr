"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import type { LeaveType, ApprovalLevel, QuotaUnit } from "@/lib/types";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Pencil, Trash2, X, Save, ToggleLeft, ToggleRight,
  Calendar, Hash, RefreshCw, Bell, Shield, Palette,
} from "lucide-react";

const COLORS = [
  "#3B82F6", "#EF4444", "#F59E0B", "#8B5CF6",
  "#EC4899", "#10B981", "#6366F1", "#14B8A6",
];

const approvalLevelLabels: Record<ApprovalLevel, string> = {
  SINGLE: "Single (1 level)",
  DOUBLE: "Double (2 level)",
  MANAGEMENT: "Management",
};

const quotaUnitLabels: Record<QuotaUnit, string> = {
  DAYS: "Hari",
  HOURS: "Jam",
};

interface LeaveTypeFormData {
  typeName: string;
  typeCode: string;
  defaultQuota: number;
  quotaUnit: QuotaUnit;
  carryOverEnabled: boolean;
  carryOverMax: number;
  requiresAttachment: boolean;
  minNoticeDays: number;
  approvalLevel: ApprovalLevel;
  colorCode: string;
  description: string;
  isActive: boolean;
}

const emptyForm: LeaveTypeFormData = {
  typeName: "",
  typeCode: "",
  defaultQuota: 12,
  quotaUnit: "DAYS",
  carryOverEnabled: true,
  carryOverMax: 6,
  requiresAttachment: false,
  minNoticeDays: 7,
  approvalLevel: "DOUBLE",
  colorCode: "#3B82F6",
  description: "",
  isActive: true,
};

export default function LeaveTypesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<LeaveTypeFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "HR_ADMIN") return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getAllLeaveTypes();
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (item: LeaveType) => {
    setFormData({
      typeName: item.typeName,
      typeCode: item.typeCode,
      defaultQuota: item.defaultQuota,
      quotaUnit: item.quotaUnit,
      carryOverEnabled: item.carryOverEnabled,
      carryOverMax: item.carryOverMax || 0,
      requiresAttachment: item.requiresAttachment,
      minNoticeDays: item.minNoticeDays,
      approvalLevel: item.approvalLevel,
      colorCode: item.colorCode,
      description: item.description || "",
      isActive: item.isActive,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        const updated = await api.updateLeaveType(editingId, formData);
        setItems(prev => prev.map(i => i.id === editingId ? updated : i));
      } else {
        const created = await api.createLeaveType(formData);
        setItems(prev => [...prev, created]);
      }
      handleCancel();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: LeaveType) => {
    const updated = await api.updateLeaveType(item.id, { isActive: !item.isActive });
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await api.deleteLeaveType(deleteId);
    setItems(prev => prev.filter(i => i.id !== deleteId));
    setDeleteId(null);
  };

  if (user?.role !== "HR_ADMIN") {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Akses ditolak. Hanya Admin HR yang dapat mengakses halaman ini.
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Tipe Cuti"
        subtitle="Konfigurasi jenis cuti dan kebijakan cuti karyawan"
      />

      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {items.length} tipe cuti dikonfigurasi
          </div>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Tambah Tipe Cuti
          </Button>
        </div>

        {/* Form Panel */}
        {showForm && (
          <Card className="border-indigo-200 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  {editingId ? "Edit Tipe Cuti" : "Tambah Tipe Cuti Baru"}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nama */}
                <div className="md:col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">Nama Tipe Cuti *</label>
                  <Input
                    value={formData.typeName}
                    onChange={e => setFormData(prev => ({ ...prev, typeName: e.target.value }))}
                    placeholder="Contoh: Cuti Tahunan"
                  />
                </div>

                {/* Kode */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Kode *</label>
                  <Input
                    value={formData.typeCode}
                    onChange={e => setFormData(prev => ({ ...prev, typeCode: e.target.value.toUpperCase() }))}
                    placeholder="CT"
                    maxLength={10}
                  />
                </div>

                {/* Quota Default */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Kuota Default *</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={formData.defaultQuota}
                      onChange={e => setFormData(prev => ({ ...prev, defaultQuota: parseInt(e.target.value) || 0 }))}
                      className="flex-1"
                    />
                    <Select
                      value={formData.quotaUnit}
                      onChange={e => setFormData(prev => ({ ...prev, quotaUnit: e.target.value as QuotaUnit }))}
                      className="w-28"
                    >
                      <option value="DAYS">Hari</option>
                      <option value="HOURS">Jam</option>
                    </Select>
                  </div>
                </div>

                {/* Approval Level */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Tingkat Approval *</label>
                  <Select
                    value={formData.approvalLevel}
                    onChange={e => setFormData(prev => ({ ...prev, approvalLevel: e.target.value as ApprovalLevel }))}
                  >
                    <option value="SINGLE">Single (1 level)</option>
                    <option value="DOUBLE">Double (2 level)</option>
                    <option value="MANAGEMENT">Management</option>
                  </Select>
                </div>

                {/* Min Notice Days */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Minimal Hari Notice</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={formData.minNoticeDays}
                      onChange={e => setFormData(prev => ({ ...prev, minNoticeDays: parseInt(e.target.value) || 0 }))}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">hari</span>
                  </div>
                </div>

                {/* Carry Over Max */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Maks Carry Over</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={formData.carryOverMax}
                      onChange={e => setFormData(prev => ({ ...prev, carryOverMax: parseInt(e.target.value) || 0 }))}
                      className="flex-1"
                      disabled={!formData.carryOverEnabled}
                    />
                    <span className="text-sm text-muted-foreground">hari</span>
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Warna</label>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-10 w-10 rounded-lg border-2"
                      style={{ borderColor: formData.colorCode, backgroundColor: formData.colorCode + "20" }}
                    />
                    <div className="flex gap-1.5 flex-wrap">
                      {COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, colorCode: color }))}
                          className={`h-7 w-7 rounded-md transition-all ${formData.colorCode === color ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">Deskripsi</label>
                  <Input
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Deskripsi tambahan untuk tipe cuti ini"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-6 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, carryOverEnabled: !prev.carryOverEnabled }))}
                    className={`${formData.carryOverEnabled ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {formData.carryOverEnabled ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                  <span className="text-sm">Enable Carry Over</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, requiresAttachment: !prev.requiresAttachment }))}
                    className={`${formData.requiresAttachment ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {formData.requiresAttachment ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                  <span className="text-sm">Wajib Lampiran</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                    className={`${formData.isActive ? "text-emerald-600" : "text-muted-foreground"}`}
                  >
                    {formData.isActive ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                  <span className="text-sm">Aktif</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Batal
                </Button>
                <Button onClick={handleSave} disabled={saving || !formData.typeName || !formData.typeCode}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Tipe Cuti"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Belum ada tipe cuti. Klik tombol di atas untuk menambah.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 text-sm font-medium">Tipe Cuti</th>
                      <th className="text-left px-4 py-3 text-sm font-medium">Kode</th>
                      <th className="text-left px-4 py-3 text-sm font-medium">Kuota</th>
                      <th className="text-left px-4 py-3 text-sm font-medium">Approval</th>
                      <th className="text-left px-4 py-3 text-sm font-medium">Carry Over</th>
                      <th className="text-left px-4 py-3 text-sm font-medium">Status</th>
                      <th className="text-right px-4 py-3 text-sm font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map(item => (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: item.colorCode }}
                            />
                            <div>
                              <p className="font-medium">{item.typeName}</p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-mono">{item.typeCode}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">
                            {item.defaultQuota} {quotaUnitLabels[item.quotaUnit]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs">
                            {approvalLevelLabels[item.approvalLevel]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {item.carryOverEnabled ? (
                            <span className="text-sm text-emerald-600">
                              Ya (max {item.carryOverMax} hari)
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Tidak</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={item.isActive ? "success" : "destructive"}>
                            {item.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(item)}
                              title={item.isActive ? "Nonaktifkan" : "Aktifkan"}
                            >
                              {item.isActive ? (
                                <ToggleRight className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(item.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-destructive">Hapus Tipe Cuti?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Tipe cuti yang dihapus tidak dapat dikembalikan. Pastikan tidak ada karyawan yang menggunakan tipe cuti ini.
              </p>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setDeleteId(null)}>
                  Batal
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Hapus
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}