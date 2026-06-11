"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users, Search, Plus, X, Mail, Building2, Calendar,
  MoreVertical, Edit2, Trash2, UserX, UserCheck,
  AlertCircle, UserPlus,
} from "lucide-react";

export default function EmployeesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    department: "",
    joinDate: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.role !== "HR_ADMIN") {
      router.replace("/hr");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await api.getEmployees();
        setEmployees(data);
      } catch (error) {
        // 401/403 = not authenticated yet, silently skip
        if (error instanceof Error && (error.message.includes("401") || error.message.includes("Not authenticated"))) return;
        console.error("Failed to fetch employees:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter((emp) => {
    const query = searchQuery.toLowerCase();
    return (
      emp.name.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query) ||
      emp.department.toLowerCase().includes(query)
    );
  });

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.email || !newEmployee.department) {
      return;
    }

    setSubmitting(true);
    try {
      // Simulate adding employee
      await new Promise((resolve) => setTimeout(resolve, 500));
      const addedEmployee: User = {
        id: `e-${Date.now()}`,
        name: newEmployee.name,
        email: newEmployee.email,
        role: "EMPLOYEE",
        department: newEmployee.department,
        joinDate: newEmployee.joinDate || new Date().toISOString().split("T")[0],
        isActive: true,
      };
      setEmployees((prev) => [...prev, addedEmployee]);
      setNewEmployee({ name: "", email: "", department: "", joinDate: "" });
      setShowAddForm(false);
    } catch (error) {
      console.error("Failed to add employee:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Memuat data karyawan...</p>
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
          <h1 className="text-2xl font-bold tracking-tight">Kelola Karyawan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Total {employees.length} karyawan terdaftar
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Karyawan
        </Button>
      </div>

      {/* Add Employee Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md mx-4 shadow-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Tambah Karyawan Baru
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowAddForm(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nama Lengkap</label>
                  <Input
                    placeholder="Masukkan nama lengkap"
                    value={newEmployee.name}
                    onChange={(e) =>
                      setNewEmployee((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="nama@email.com"
                    value={newEmployee.email}
                    onChange={(e) =>
                      setNewEmployee((prev) => ({ ...prev, email: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Departemen</label>
                  <Input
                    placeholder="Contoh: Finance, HR, Operations"
                    value={newEmployee.department}
                    onChange={(e) =>
                      setNewEmployee((prev) => ({ ...prev, department: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tanggal Bergabung</label>
                  <Input
                    type="date"
                    value={newEmployee.joinDate}
                    onChange={(e) =>
                      setNewEmployee((prev) => ({ ...prev, joinDate: e.target.value }))
                    }
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowAddForm(false)}
                  >
                    Batal
                  </Button>
                  <Button type="submit" className="flex-1" disabled={submitting}>
                    {submitting ? "Menyimpan..." : "Simpan"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari karyawan berdasarkan nama, email, atau departemen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-6 py-4 text-left font-medium text-muted-foreground">Karyawan</th>
                  <th className="px-6 py-4 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-6 py-4 text-left font-medium text-muted-foreground">Departemen</th>
                  <th className="px-6 py-4 text-left font-medium text-muted-foreground">Tanggal Bergabung</th>
                  <th className="px-6 py-4 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-4 text-right font-medium text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-sm shrink-0">
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">
                              ID: {emp.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{emp.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{emp.department}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span>{emp.joinDate}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {emp.isActive ? (
                          <Badge variant="success" className="gap-1">
                            <UserCheck className="h-3 w-3" />
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <UserX className="h-3 w-3" />
                            Nonaktif
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-10 w-10 text-muted-foreground/50" />
                        <p className="text-muted-foreground">
                          {searchQuery
                            ? "Tidak ada karyawan yang cocok dengan pencarian"
                            : "Belum ada data karyawan"}
                        </p>
                        {!searchQuery && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => setShowAddForm(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Tambah Karyawan Pertama
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500 text-white shrink-0">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-indigo-600">Total Karyawan</p>
                <p className="text-2xl font-bold text-indigo-900">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white shrink-0">
                <UserCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-600">Karyawan Aktif</p>
                <p className="text-2xl font-bold text-emerald-900">
                  {employees.filter((e) => e.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white shrink-0">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-600">Departemen</p>
                <p className="text-2xl font-bold text-amber-900">
                  {new Set(employees.map((e) => e.department)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}