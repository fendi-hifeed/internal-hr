"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import type { GeoZone, GeoZoneType } from "@/lib/types";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Pencil, Trash2, X, Save, ToggleLeft, ToggleRight,
  MapPin, Building2, Home, Wifi, Trash,
} from "lucide-react";

const zoneTypeIcons: Record<GeoZoneType, React.ReactNode> = {
  OFFICE: <Building2 className="h-4 w-4" />,
  BRANCH: <Home className="h-4 w-4" />,
  REMOTE: <Wifi className="h-4 w-4" />,
};

const zoneTypeLabels: Record<GeoZoneType, string> = {
  OFFICE: "Kantor",
  BRANCH: "Cabang",
  REMOTE: "Remote",
};

interface GeoZoneFormData {
  zoneName: string;
  zoneType: GeoZoneType;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  address: string;
  isActive: boolean;
}

const emptyForm: GeoZoneFormData = {
  zoneName: "",
  zoneType: "OFFICE",
  latitude: -6.2088,
  longitude: 106.8456,
  radiusMeters: 100,
  address: "",
  isActive: true,
};

export default function GeoZonesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<GeoZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<GeoZoneFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "HR_ADMIN") return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getGeoZones();
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

  const handleEdit = (item: GeoZone) => {
    setFormData({
      zoneName: item.zoneName,
      zoneType: item.zoneType,
      latitude: item.latitude,
      longitude: item.longitude,
      radiusMeters: item.radiusMeters,
      address: item.address,
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
        const updated = await api.updateGeoZone(editingId, formData);
        setItems(prev => prev.map(i => i.id === editingId ? updated : i));
      } else {
        const created = await api.createGeoZone(formData);
        setItems(prev => [...prev, created]);
      }
      handleCancel();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: GeoZone) => {
    const updated = await api.updateGeoZone(item.id, { isActive: !item.isActive });
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await api.deleteGeoZone(deleteId);
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
        title="Geo Zones"
        subtitle="Konfigurasi lokasi kantor dan zona absensi"
      />

      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {items.length} zona geografis dikonfigurasi
          </div>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Tambah Zona
          </Button>
        </div>

        {/* Form Panel */}
        {showForm && (
          <Card className="border-indigo-200 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {editingId ? "Edit Zona Geografis" : "Tambah Zona Geografis Baru"}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nama Zona */}
                <div className="md:col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">Nama Zona *</label>
                  <Input
                    value={formData.zoneName}
                    onChange={e => setFormData(prev => ({ ...prev, zoneName: e.target.value }))}
                    placeholder="Contoh: Kantor Pusat HiFeed"
                  />
                </div>

                {/* Tipe Zona */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Tipe Zona *</label>
                  <Select
                    value={formData.zoneType}
                    onChange={e => setFormData(prev => ({ ...prev, zoneType: e.target.value as GeoZoneType }))}
                  >
                    <option value="OFFICE">Kantor</option>
                    <option value="BRANCH">Cabang</option>
                    <option value="REMOTE">Remote</option>
                  </Select>
                </div>

                {/* Radius */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Radius Zona (meter)</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={formData.radiusMeters}
                      onChange={e => setFormData(prev => ({ ...prev, radiusMeters: parseInt(e.target.value) || 0 }))}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">m</span>
                  </div>
                </div>

                {/* Latitude */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Latitude *</label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={formData.latitude}
                    onChange={e => setFormData(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
                    placeholder="-6.2088"
                  />
                </div>

                {/* Longitude */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Longitude *</label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={formData.longitude}
                    onChange={e => setFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
                    placeholder="106.8456"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">Alamat</label>
                  <Input
                    value={formData.address}
                    onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Jl. Raya Serang KM 12, Kab. Serang, Banten"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-4 pt-2">
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
                  <span className="text-sm">Zona Aktif</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Batal
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !formData.zoneName || !formData.latitude || !formData.longitude}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Zona"}
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
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Belum ada zona geografis. Klik tombol di atas untuk menambah.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 text-sm font-medium">Zona</th>
                      <th className="text-left px-4 py-3 text-sm font-medium">Tipe</th>
                      <th className="text-left px-4 py-3 text-sm font-medium">Koordinat</th>
                      <th className="text-left px-4 py-3 text-sm font-medium">Radius</th>
                      <th className="text-left px-4 py-3 text-sm font-medium">Alamat</th>
                      <th className="text-left px-4 py-3 text-sm font-medium">Status</th>
                      <th className="text-right px-4 py-3 text-sm font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map(item => (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <MapPin className="h-4 w-4 text-primary" />
                            </div>
                            <p className="font-medium">{item.zoneName}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="gap-1.5">
                            {zoneTypeIcons[item.zoneType]}
                            {zoneTypeLabels[item.zoneType]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-mono text-muted-foreground">
                            <div>{item.latitude.toFixed(6)}</div>
                            <div>{item.longitude.toFixed(6)}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">{item.radiusMeters} m</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm max-w-[200px] truncate">{item.address || "-"}</p>
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
              <CardTitle className="text-destructive">Hapus Zona Geografis?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Zona yang dihapus tidak dapat dikembalikan. Pastikan tidak ada karyawan yang menggunakan zona ini untuk absensi.
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