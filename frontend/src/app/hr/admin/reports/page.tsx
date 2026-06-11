"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { attendanceLogs, leaveRequests, leaveTypes, adminStats } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { Users, Clock, CalendarDays, Download, FileSpreadsheet, BarChart3, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";

export default function ReportsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const reports = [
    {
      id: "attendance-monthly",
      title: "Laporan Absensi Bulanan",
      description: "Rekap absensi semua karyawan per bulan",
      icon: Clock,
      type: "attendance",
      fields: ["Tanggal", "Nama Karyawan", "Jam Masuk", "Jam Pulang", "Status", "Lokasi"],
    },
    {
      id: "leave-summary",
      title: "Ringkasan Cuti Karyawan",
      description: "Saldo dan penggunaan cuti per karyawan",
      icon: CalendarDays,
      type: "leave",
      fields: ["Nama Karyawan", "Tipe Cuti", "Kuota", "Terpakai", "Pending", "Sisa"],
    },
    {
      id: "late-analysis",
      title: "Analisis Keterlambatan",
      description: "Data keterlambatan dan pola迟到",
      icon: CheckCircle,
      type: "attendance",
      fields: ["Tanggal", "Nama Karyawan", "Jam Masuk", "Jenis Keterlambatan", "Durasi"],
    },
    {
      id: "employee-overview",
      title: "Data Karyawan",
      description: "Overview seluruh karyawan aktif",
      icon: Users,
      type: "employee",
      fields: ["Nama", "Email", "Departemen", "Atasan", "Tanggal Bergabung", "Status"],
    },
  ];

  const handleExport = (reportId: string) => {
    // Simulate export - in real app would call API
    alert(`Exporting ${reportId}... (simulated)`);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Laporan & Export</h1>
          <p className="text-sm text-muted-foreground">Generate dan export laporan HR dalam format spreadsheet</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Karyawan" value={adminStats.totalEmployees} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Total Absensi" value={attendanceLogs.length} icon={<Clock className="h-5 w-5" />} variant="success" />
        <StatCard label="Total Cuti" value={leaveRequests.length} icon={<CalendarDays className="h-5 w-5" />} variant="warning" />
        <StatCard label="Tipe Cuti" value={leaveTypes.length} icon={<BarChart3 className="h-5 w-5" />} />
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map(report => {
          const Icon = report.icon;
          return (
            <Card key={report.id} className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => setSelectedReport(report.id === selectedReport ? null : report.id)}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{report.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{report.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {report.fields.slice(0, 4).map(f => (
                        <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
                      ))}
                      {report.fields.length > 4 && (
                        <Badge variant="outline" className="text-[10px]">+{report.fields.length - 4} more</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="mt-4 gap-2"
                      onClick={(e) => { e.stopPropagation(); handleExport(report.id); }}
                    >
                      <Download className="h-3.5 w-3.5" /> Export Excel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview Area */}
      {selectedReport && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{reports.find(r => r.id === selectedReport)?.title}</CardTitle>
                <CardDescription>Preview data (first 10 rows)</CardDescription>
              </div>
              <Button size="sm" className="gap-2" onClick={() => handleExport(selectedReport)}>
                <FileSpreadsheet className="h-4 w-4" /> Download Full Report
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {reports.find(r => r.id === selectedReport)?.fields.map(f => (
                      <th key={f} className="px-4 py-2.5 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">{f}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr className="text-muted-foreground text-center">
                    <td colSpan={reports.find(r => r.id === selectedReport)?.fields.length || 0} className="py-8 text-sm">
                      Preview akan menampilkan data sesuai laporan yang dipilih
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}