"use client";

import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { users } from "@/lib/mock-data";
import { Mail, Phone, Building2, Calendar, Shield, User, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) {
    router.push("/hr/login");
    return null;
  }

  const fullUser = users.find(u => u.id === user.id || u.email === user.email);
  const isHRAdmin = user.role === "HR_ADMIN";

  const handleLogout = () => {
    logout();
    router.push("/hr/login");
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      {/* Profile Header */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-3xl font-bold shadow-lg">
              {user.name?.charAt(0) || "?"}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{user.name}</h2>
              <p className="text-muted-foreground text-sm">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={isHRAdmin ? "default" : "secondary"} className={isHRAdmin ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"}>
                  <Shield className="h-3 w-3 mr-1" />
                  {isHRAdmin ? "Admin HR" : "Karyawan"}
                </Badge>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Aktif
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Informasi Akun</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nama Lengkap</p>
                <p className="text-sm font-medium">{user.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="text-sm font-medium">{isHRAdmin ? "Admin HR" : "Karyawan"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Detail Karyawan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Departemen</p>
                <p className="text-sm font-medium">{user.department || fullUser?.department || "-"}</p>
              </div>
            </div>
            {fullUser?.supervisorName && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Atasan</p>
                  <p className="text-sm font-medium">{fullUser.supervisorName}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tanggal Bergabung</p>
                <p className="text-sm font-medium">{fullUser ? formatDate(fullUser.joinDate) : "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Section */}
      <Card>
        <CardHeader>
          <CardTitle>Keamanan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">Terakhir diubah: tidak diketahui</p>
            </div>
            <Button variant="outline" size="sm">Ubah Password</Button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="text-sm font-medium">Session aktif</p>
              <p className="text-xs text-muted-foreground">Token berlaku 15 menit</p>
            </div>
            <Badge variant="success" className="bg-emerald-100 text-emerald-700">Aktif</Badge>
          </div>
          {isHRAdmin && (
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Two-Factor Auth (MFA)</p>
                <p className="text-xs text-muted-foreground">TOTP untuk Admin HR</p>
              </div>
              <Button variant="outline" size="sm">Setup MFA</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logout */}
      <div className="flex justify-end">
        <Button variant="destructive" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>
    </div>
  );
}