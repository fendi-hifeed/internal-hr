"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import type {
  ClearanceConfigItem,
  ClearanceCategory,
} from "@/lib/types";
import { CATEGORY_LABELS as CAT_LABELS } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Settings, Plus, Loader2, GripVertical, Trash2, Edit2,
  X, AlertCircle, CheckCircle2, Save,
} from "lucide-react";

const CATEGORIES: ClearanceCategory[] = [
  "IT_EQUIPMENT", "DOCUMENTS", "FINANCE", "FACILITIES", "HR_ADMIN", "SUPERVISOR", "OTHER",
];

const CAT_COLORS: Record<string, string> = {
  IT_EQUIPMENT: "bg-purple-100 text-purple-700 border-purple-200",
  DOCUMENTS: "bg-blue-100 text-blue-700 border-blue-200",
  FINANCE: "bg-green-100 text-green-700 border-green-200",
  FACILITIES: "bg-orange-100 text-orange-700 border-orange-200",
  HR_ADMIN: "bg-pink-100 text-pink-700 border-pink-200",
  SUPERVISOR: "bg-indigo-100 text-indigo-700 border-indigo-200",
  OTHER: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function ClearanceConfigPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<ClearanceConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    itemName: "",
    description: "",
    category: "IT_EQUIPMENT" as ClearanceCategory,
    requiresProof: false,
    orderIndex: 0,
  });
  const [editForm, setEditForm] = useState<Partial<ClearanceConfigItem>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user?.role !== "HR_ADMIN") {
      router.replace("/hr");
    }
  }, [user, authLoading, router]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await api.getClearanceConfig();
      setItems(data);
    } catch (error) {
      if (error instanceof Error && (error.message.includes("401") || error.message.includes("Not authenticated"))) return;
      console.error("Failed to fetch config:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleAdd = async () => {
    if (!addForm.itemName.trim()) {
      setError("Nama item wajib diisi.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.createClearanceConfigItem({
        itemName: addForm.itemName,
        description: addForm.description || undefined,
        category: addForm.category,
        requiresProof: addForm.requiresProof,
        orderIndex: items.length + 1,
        isActive: true,
      });
      setShowAdd(false);
      setAddForm({ itemName: "", description: "", category: "IT_EQUIPMENT", requiresProof: false, orderIndex: 0 });
      fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah item.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (id: string) => {
    setSubmitting(true);
    try {
      await api.updateClearanceConfigItem(id, {
        ...editForm,
        itemName: editForm.itemName,
        description: editForm.description,
        category: editForm.category,
        requiresProof: editForm.requiresProof,
        orderIndex: editForm.orderIndex,
        isActive: editForm.isActive,
      } as any);
      setEditingId(null);
      fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal update item.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus item dari template?")) return;
    try {
      await api.deleteClearanceConfigItem(id);
      fetchItems();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleToggleActive = async (item: ClearanceConfigItem) => {
    try {
      await api.updateClearanceConfigItem(item.id, { isActive: !item.isActive } as any);
      fetchItems();
    } catch (err) {
      console.error("Failed to toggle:", err);
    }
  };

  // Drag and drop reorder
  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === id) return;
    const fromIdx = items.findIndex(i => i.id === draggedId);
    const toIdx = items.findIndex(i => i.id === id);
    const newItems = [...items];
    const [moved] = newItems.splice(fromIdx, 1);
    newItems.splice(toIdx, 0, moved);
    setItems(newItems);
  };
  const handleDragEnd = async () => {
    if (!draggedId) return;
    setDraggedId(null);
    // Save new order
    try {
      await api.reorderClearanceConfig(items.map((item, idx) => ({ id: item.id, orderIndex: idx })));
    } catch (err) {
      console.error("Failed to reorder:", err);
      fetchItems(); // revert
    }
  };

  // Group by category
  const grouped = CATEGORIES.map(cat => ({
    category: cat,
    label: CAT_LABELS[cat],
    items: items.filter(i => i.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Template Checklist Clearance</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Konfigurasi item checklist yang harus dilengkapi saat karyawan resign
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Item
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-indigo-100 bg-indigo-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Settings className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-indigo-800">Template Checklist Clearance</p>
              <p className="text-xs text-indigo-600 mt-1">
                Template ini otomatis di-generate sebagai checklist saat HR menginisiasi proses resignasi karyawan.
                Drag item untuk reorder. Item yang tidak aktif tetap tersimpan tapi tidak muncul di checklist baru.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items by category */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ category, label, items: catItems }) => (
            <Card key={category}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-sm font-medium ${CAT_COLORS[category] || "bg-slate-100 text-slate-700"}`}>
                      {label}
                    </span>
                    <span className="text-xs text-slate-400 font-normal">{catItems.length} item</span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {catItems.map((item, idx) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(item.id)}
                      onDragOver={(e) => handleDragOver(e, item.id)}
                      onDragEnd={handleDragEnd}
                      className={`px-6 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors ${
                        draggedId === item.id ? "opacity-50 bg-indigo-50" : ""
                      } ${!item.isActive ? "opacity-50" : ""}`}
                    >
                      <GripVertical className="h-4 w-4 text-slate-300 cursor-grab shrink-0" />
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium text-slate-500">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingId === item.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editForm.itemName || ""}
                              onChange={e => setEditForm(f => ({ ...f, itemName: e.target.value }))}
                              className="text-sm"
                              placeholder="Nama item"
                            />
                            <div className="flex items-center gap-2">
                              <select
                                value={editForm.category || item.category}
                                onChange={e => setEditForm(f => ({ ...f, category: e.target.value as ClearanceCategory }))}
                                className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                {CATEGORIES.map(c => (
                                  <option key={c} value={c}>{CAT_LABELS[c]}</option>
                                ))}
                              </select>
                              <label className="flex items-center gap-1 text-xs text-slate-500">
                                <input
                                  type="checkbox"
                                  checked={editForm.requiresProof ?? item.requiresProof}
                                  onChange={e => setEditForm(f => ({ ...f, requiresProof: e.target.checked }))}
                                  className="rounded"
                                />
                                Perlu bukti
                              </label>
                            </div>
                            <Input
                              value={editForm.description || ""}
                              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                              className="text-xs"
                              placeholder="Deskripsi (opsional)"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleEdit(item.id)} disabled={submitting} className="gap-1">
                                <Save className="h-3 w-3" />Simpan
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Batal</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-medium ${!item.isActive ? "line-through text-slate-400" : "text-slate-700"}`}>
                                {item.itemName}
                              </p>
                              {item.requiresProof && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                                  <AlertCircle className="h-2.5 w-2.5" /> bukti
                                </span>
                              )}
                              {!item.isActive && (
                                <Badge variant="outline" className="text-xs text-slate-400 border-slate-200">Nonaktif</Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => { setEditingId(item.id); setEditForm({ itemName: item.itemName, description: item.description, category: item.category, requiresProof: item.requiresProof }); }}
                          className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`h-8 w-8 flex items-center justify-center rounded-lg text-xs font-medium ${
                            item.isActive ? "text-green-600 hover:bg-green-50" : "text-slate-400 hover:bg-slate-50"
                          }`}
                          title={item.isActive ? "Nonaktifkan" : "Aktifkan"}
                        >
                          {item.isActive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-800">Tambah Item Checklist</h2>
              <button onClick={() => { setShowAdd(false); setError(""); }} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 inline mr-1" />{error}
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Nama Item *</label>
                <Input
                  value={addForm.itemName}
                  onChange={e => setAddForm(f => ({ ...f, itemName: e.target.value }))}
                  placeholder="Contoh: Kembalikan Laptop Kerja"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Kategori</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={addForm.category}
                  onChange={e => setAddForm(f => ({ ...f, category: e.target.value as ClearanceCategory }))}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{CAT_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Deskripsi (opsional)</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={2}
                  value={addForm.description}
                  onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Deskripsi atau instruksi untuk item ini..."
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addForm.requiresProof}
                  onChange={e => setAddForm(f => ({ ...f, requiresProof: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                Perlu upload bukti saat completion
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setShowAdd(false); setError(""); }}>Batal</Button>
                <Button onClick={handleAdd} disabled={submitting} className="gap-2">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Tambah Item
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}