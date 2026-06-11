"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LogoSvg from "@/components/layout/logo";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push(user.role === "HR_ADMIN" ? "/hr/admin" : "/hr/employee");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      // Login success - redirect handled by useEffect
    } catch {
      // Error shown via context
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-50 via-white to-indigo-100 relative overflow-hidden border-r border-indigo-100">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-200/40 via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col justify-center p-16">
          <div className="flex items-center gap-4 mb-12">
            <LogoSvg width={56} height={56} />
            <div>
              <h1 className="text-3xl font-bold text-slate-800">HiFeed</h1>
              <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">HR Presensi</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-slate-800 mb-4 leading-tight">
            Sistem Presensi<br />Berbasis Geolocation & Selfie
          </h2>
          <p className="text-lg text-slate-500 mb-12 max-w-md">
            Digitalisasi kehadiran dengan verifikasi aktif via selfie dan geo-tagging otomatis.
          </p>
          <div className="space-y-4">
            {[
              { icon: "📍", label: "Geo-fence lokasi kantor" },
              { icon: "📸", label: "Verifikasi selfie real-time" },
              { icon: "📊", label: "Dashboard analytics kehadiran" },
              { icon: "✅", label: "Approval cuti multi-level" },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-3">
                <span className="text-xl">{f.icon}</span>
                <span className="text-slate-600 text-sm">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <LogoSvg width={40} height={40} />
            <div>
              <h1 className="text-lg font-bold">HiFeed HR</h1>
              <p className="text-xs text-muted-foreground">Presensi Digital</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-1">Masuk</h2>
          <p className="text-sm text-muted-foreground mb-8">
            Gunakan email &amp; password yang sudah didaftarkan oleh Admin HR
          </p>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <Input
                type="email"
                placeholder="nama@hifeed.co"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Password</label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Memproses...</>
              ) : "Masuk"}
            </Button>
          </form>

          <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground font-medium mb-2">
              Akun Demo (hubungi Admin HR untuk akses)
            </p>
            <div className="space-y-2">
              {[
                { label: "Admin HR", email: "fendi@hifeed.co", role: "HR_ADMIN" },
                { label: "Karyawan", email: "ahmad.fauzi@hifeed.co", role: "EMPLOYEE" },
              ].map(acc => (
                <button
                  key={acc.email}
                  onClick={() => { setEmail(acc.email); setPassword("admin123"); }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-background border border-border hover:bg-accent hover:border-primary/50 transition-all text-sm"
                >
                  <span className="font-medium">{acc.label}</span>
                  <div className="text-right">
                    <span className="text-muted-foreground text-xs block">{acc.email}</span>
                    <span className="text-[10px] text-muted-foreground/60">{acc.role}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}