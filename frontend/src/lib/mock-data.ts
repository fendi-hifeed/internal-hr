// =============================================================================
// HR Presensi — Mock Data & Seed Data
// =============================================================================
import type {
  User, AttendanceLog, LeaveType, LeaveBalance, LeaveRequest,
  GeoZone, AdminDashboardStats, EmployeeDashboardStats,
  FlagStatus, LeaveStatus,
} from "./types";

// =============================================================================
// USERS
// =============================================================================
export const users: User[] = [
  // Admin HR
  {
    id: "u1", name: "Dewi Lestari", email: "dewi.hr@hifeed.com", role: "HR_ADMIN",
    department: "Human Resources", joinDate: "2023-01-15", isActive: true,
  },
  // Employees
  {
    id: "e1", name: "Ahmad Fauzi", email: "ahmad.fauzi@hifeed.com", role: "EMPLOYEE",
    department: "Farm Management", supervisorId: "e3", supervisorName: "Pak Darmo",
    joinDate: "2024-03-01", isActive: true,
  },
  {
    id: "e2", name: "Siti Rahma", email: "siti.rahma@hifeed.com", role: "EMPLOYEE",
    department: "Finance", supervisorId: "e4", supervisorName: "Bu Ani",
    joinDate: "2024-06-15", isActive: true,
  },
  {
    id: "e3", name: "Darmo Santoso", email: "darmo@hifeed.com", role: "EMPLOYEE",
    department: "Farm Management", supervisorId: "e5", supervisorName: "Pak Hendra",
    joinDate: "2023-08-20", isActive: true,
  },
  {
    id: "e4", name: "Ani Wijayanti", email: "ani.wijayanti@hifeed.com", role: "EMPLOYEE",
    department: "Finance", supervisorId: "e5", supervisorName: "Pak Hendra",
    joinDate: "2023-11-01", isActive: true,
  },
  {
    id: "e5", name: "Hendra Wijaya", email: "hendra.wijaya@hifeed.com", role: "EMPLOYEE",
    department: "Operations", supervisorId: "e5", supervisorName: "Pak Hendra",
    joinDate: "2023-05-10", isActive: true,
  },
  {
    id: "e6", name: "Rina Oktaviani", email: "rina.oktaviani@hifeed.com", role: "EMPLOYEE",
    department: "R&D", supervisorId: "e5", supervisorName: "Pak Hendra",
    joinDate: "2024-01-20", isActive: true,
  },
  {
    id: "e7", name: "Budi Santika", email: "budi.santika@hifeed.com", role: "EMPLOYEE",
    department: "Logistics", supervisorId: "e5", supervisorName: "Pak Hendra",
    joinDate: "2024-09-05", isActive: true,
  },
];

// =============================================================================
// LEAVE TYPES
// =============================================================================
export const leaveTypes: LeaveType[] = [
  {
    id: "lt1", typeName: "Cuti Tahunan", typeCode: "CT", defaultQuota: 12,
    quotaUnit: "DAYS", carryOverEnabled: true, carryOverMax: 6,
    requiresAttachment: false, minNoticeDays: 7, approvalLevel: "DOUBLE",
    isActive: true, colorCode: "#3B82F6", description: "Cuti tahunan reguler",
  },
  {
    id: "lt2", typeName: "Sakit", typeCode: "S", defaultQuota: 14,
    quotaUnit: "DAYS", carryOverEnabled: false,
    requiresAttachment: true, minNoticeDays: 0, approvalLevel: "SINGLE",
    isActive: true, colorCode: "#EF4444", description: "Cuti sakit dengan surat dokter",
  },
  {
    id: "lt3", typeName: "Izin Khusus", typeCode: "IK", defaultQuota: 3,
    quotaUnit: "DAYS", carryOverEnabled: false,
    requiresAttachment: false, minNoticeDays: 1, approvalLevel: "SINGLE",
    isActive: true, colorCode: "#F59E0B", description: "Izin khusus (urgent matter)",
  },
  {
    id: "lt4", typeName: "Cuti Besar", typeCode: "CB", defaultQuota: 30,
    quotaUnit: "DAYS", carryOverEnabled: false,
    requiresAttachment: false, minNoticeDays: 30, approvalLevel: "MANAGEMENT",
    isActive: true, colorCode: "#8B5CF6", description: "Cuti besar (melaternity, etc)",
  },
  {
    id: "lt5", typeName: "Cuti Pernikahan", typeCode: "CP", defaultQuota: 3,
    quotaUnit: "DAYS", carryOverEnabled: false,
    requiresAttachment: true, minNoticeDays: 14, approvalLevel: "SINGLE",
    isActive: true, colorCode: "#EC4899", description: "Cuti pernikahan",
  },
  {
    id: "lt6", typeName: "Cuti Kematian", typeCode: "CK", defaultQuota: 2,
    quotaUnit: "DAYS", carryOverEnabled: false,
    requiresAttachment: true, minNoticeDays: 1, approvalLevel: "SINGLE",
    isActive: true, colorCode: "#6B7280", description: "Cuti kematian keluarga inti",
  },
];

// =============================================================================
// LEAVE BALANCES (per employee, year 2026)
// =============================================================================
function makeBalance(empId: string, ltId: string, ltName: string, ltCode: string, color: string, total: number, used: number, unit: "DAYS" | "HOURS" = "DAYS"): LeaveBalance {
  return {
    leaveTypeId: ltId, leaveTypeName: ltName, leaveTypeCode: ltCode,
    colorCode: color, totalQuota: total, used, pending: 0,
    available: total - used, quotaUnit: unit,
  };
}

export const leaveBalances: Record<string, LeaveBalance[]> = {
  e1: [
    makeBalance("e1", "lt1", "Cuti Tahunan", "CT", "#3B82F6", 12, 4),
    makeBalance("e1", "lt2", "Sakit", "S", "#EF4444", 14, 2),
    makeBalance("e1", "lt3", "Izin Khusus", "IK", "#F59E0B", 3, 1),
    makeBalance("e1", "lt4", "Cuti Besar", "CB", "#8B5CF6", 30, 0),
  ],
  e2: [
    makeBalance("e2", "lt1", "Cuti Tahunan", "CT", "#3B82F6", 12, 8),
    makeBalance("e2", "lt2", "Sakit", "S", "#EF4444", 14, 1),
    makeBalance("e2", "lt3", "Izin Khusus", "IK", "#F59E0B", 3, 3),
    makeBalance("e2", "lt4", "Cuti Besar", "CB", "#8B5CF6", 30, 0),
  ],
  e3: [
    makeBalance("e3", "lt1", "Cuti Tahunan", "CT", "#3B82F6", 12, 2),
    makeBalance("e3", "lt2", "Sakit", "S", "#EF4444", 14, 3),
    makeBalance("e3", "lt3", "Izin Khusus", "IK", "#F59E0B", 3, 0),
    makeBalance("e3", "lt4", "Cuti Besar", "CB", "#8B5CF6", 30, 0),
  ],
  e4: [
    makeBalance("e4", "lt1", "Cuti Tahunan", "CT", "#3B82F6", 12, 10),
    makeBalance("e4", "lt2", "Sakit", "S", "#EF4444", 14, 0),
    makeBalance("e4", "lt3", "Izin Khusus", "IK", "#F59E0B", 3, 2),
    makeBalance("e4", "lt4", "Cuti Besar", "CB", "#8B5CF6", 30, 0),
  ],
  e5: [
    makeBalance("e5", "lt1", "Cuti Tahunan", "CT", "#3B82F6", 12, 1),
    makeBalance("e5", "lt2", "Sakit", "S", "#EF4444", 14, 5),
    makeBalance("e5", "lt3", "Izin Khusus", "IK", "#F59E0B", 3, 0),
    makeBalance("e5", "lt4", "Cuti Besar", "CB", "#8B5CF6", 30, 0),
  ],
  e6: [
    makeBalance("e6", "lt1", "Cuti Tahunan", "CT", "#3B82F6", 12, 6),
    makeBalance("e6", "lt2", "Sakit", "S", "#EF4444", 14, 0),
    makeBalance("e6", "lt3", "Izin Khusus", "IK", "#F59E0B", 3, 1),
    makeBalance("e6", "lt4", "Cuti Besar", "CB", "#8B5CF6", 30, 0),
  ],
  e7: [
    makeBalance("e7", "lt1", "Cuti Tahunan", "CT", "#3B82F6", 12, 3),
    makeBalance("e7", "lt2", "Sakit", "S", "#EF4444", 14, 1),
    makeBalance("e7", "lt3", "Izin Khusus", "IK", "#F59E0B", 3, 0),
    makeBalance("e7", "lt4", "Cuti Besar", "CB", "#8B5CF6", 30, 0),
  ],
};

// =============================================================================
// ATTENDANCE LOGS (last 10 days for all employees)
// =============================================================================
function makeAttendance(id: string, empId: string, empName: string, date: string, clockInH: number, clockInM: number, flag: FlagStatus, clockOutH = 17, clockOutM = 0): AttendanceLog {
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    id, employeeId: empId, employeeName: empName, date,
    clockInTime: `${pad(clockInH)}:${pad(clockInM)}:00`,
    clockInLatitude: -6.2 + Math.random() * 0.01,
    clockInLongitude: 106.8 + Math.random() * 0.01,
    clockInLocationName: "Jl. Raya Serang KM 12, Kab. Serang, Banten",
    clockInFlag: flag,
    clockOutTime: clockOutH !== null ? `${pad(clockOutH)}:${pad(clockOutM)}:00` : undefined,
    clockOutLatitude: -6.2 + Math.random() * 0.01,
    clockOutLongitude: 106.8 + Math.random() * 0.01,
  };
}

export const attendanceLogs: AttendanceLog[] = [
  // Ahmad Fauzi (e1) - mostly on time
  makeAttendance("a1", "e1", "Ahmad Fauzi", "2026-06-09", 7, 45, "ON_TIME"),
  makeAttendance("a2", "e1", "Ahmad Fauzi", "2026-06-08", 7, 58, "ON_TIME"),
  makeAttendance("a3", "e1", "Ahmad Fauzi", "2026-06-07", 8, 20, "LATE"),
  makeAttendance("a4", "e1", "Ahmad Fauzi", "2026-06-06", 7, 52, "ON_TIME"),
  makeAttendance("a5", "e1", "Ahmad Fauzi", "2026-06-05", 8, 5, "ON_TIME"),
  makeAttendance("a6", "e1", "Ahmad Fauzi", "2026-06-04", 9, 15, "VERY_LATE"),
  makeAttendance("a7", "e1", "Ahmad Fauzi", "2026-06-03", 7, 48, "ON_TIME"),
  makeAttendance("a8", "e1", "Ahmad Fauzi", "2026-06-02", 7, 55, "ON_TIME"),
  makeAttendance("a9", "e1", "Ahmad Fauzi", "2026-06-01", 8, 10, "LATE"),
  makeAttendance("a10", "e1", "Ahmad Fauzi", "2026-05-30", 7, 42, "ON_TIME"),

  // Siti Rahma (e2) - mixed
  makeAttendance("a11", "e2", "Siti Rahma", "2026-06-09", 8, 30, "LATE"),
  makeAttendance("a12", "e2", "Siti Rahma", "2026-06-08", 9, 5, "VERY_LATE"),
  makeAttendance("a13", "e2", "Siti Rahma", "2026-06-07", 7, 50, "ON_TIME"),
  makeAttendance("a14", "e2", "Siti Rahma", "2026-06-06", 8, 18, "LATE"),
  makeAttendance("a15", "e2", "Siti Rahma", "2026-06-05", 7, 59, "ON_TIME"),
  makeAttendance("a16", "e2", "Siti Rahma", "2026-06-04", 7, 45, "ON_TIME"),
  makeAttendance("a17", "e2", "Siti Rahma", "2026-06-03", 8, 22, "LATE"),
  makeAttendance("a18", "e2", "Siti Rahma", "2026-06-02", 7, 38, "ON_TIME"),
  makeAttendance("a19", "e2", "Siti Rahma", "2026-06-01", 7, 55, "ON_TIME"),
  makeAttendance("a20", "e2", "Siti Rahma", "2026-05-30", 8, 45, "LATE"),

  // Darmo Santoso (e3) - reliable
  makeAttendance("a21", "e3", "Darmo Santoso", "2026-06-09", 7, 30, "ON_TIME"),
  makeAttendance("a22", "e3", "Darmo Santoso", "2026-06-08", 7, 25, "ON_TIME"),
  makeAttendance("a23", "e3", "Darmo Santoso", "2026-06-07", 7, 40, "ON_TIME"),
  makeAttendance("a24", "e3", "Darmo Santoso", "2026-06-06", 7, 35, "ON_TIME"),
  makeAttendance("a25", "e3", "Darmo Santoso", "2026-06-05", 8, 5, "ON_TIME"),
  makeAttendance("a26", "e3", "Darmo Santoso", "2026-06-04", 7, 50, "ON_TIME"),
  makeAttendance("a27", "e3", "Darmo Santoso", "2026-06-03", 7, 28, "ON_TIME"),
  makeAttendance("a28", "e3", "Darmo Santoso", "2026-06-02", 7, 32, "ON_TIME"),
  makeAttendance("a29", "e3", "Darmo Santoso", "2026-06-01", 7, 45, "ON_TIME"),
  makeAttendance("a30", "e3", "Darmo Santoso", "2026-05-30", 7, 20, "ON_TIME"),

  // Ani Wijayanti (e4) - mostly on time but some late
  makeAttendance("a31", "e4", "Ani Wijayanti", "2026-06-09", 7, 55, "ON_TIME"),
  makeAttendance("a32", "e4", "Ani Wijayanti", "2026-06-08", 8, 10, "LATE"),
  makeAttendance("a33", "e4", "Ani Wijayanti", "2026-06-07", 7, 48, "ON_TIME"),
  makeAttendance("a34", "e4", "Ani Wijayanti", "2026-06-06", 8, 25, "LATE"),
  makeAttendance("a35", "e4", "Ani Wijayanti", "2026-06-05", 7, 42, "ON_TIME"),
  makeAttendance("a36", "e4", "Ani Wijayanti", "2026-06-04", 7, 58, "ON_TIME"),
  makeAttendance("a37", "e4", "Ani Wijayanti", "2026-06-03", 8, 5, "ON_TIME"),
  makeAttendance("a38", "e4", "Ani Wijayanti", "2026-06-02", 7, 50, "ON_TIME"),
  makeAttendance("a39", "e4", "Ani Wijayanti", "2026-06-01", 8, 15, "LATE"),
  makeAttendance("a40", "e4", "Ani Wijayanti", "2026-05-30", 7, 35, "ON_TIME"),

  // Hendra Wijaya (e5) - very reliable
  makeAttendance("a41", "e5", "Hendra Wijaya", "2026-06-09", 7, 15, "ON_TIME"),
  makeAttendance("a42", "e5", "Hendra Wijaya", "2026-06-08", 7, 20, "ON_TIME"),
  makeAttendance("a43", "e5", "Hendra Wijaya", "2026-06-07", 7, 10, "ON_TIME"),
  makeAttendance("a44", "e5", "Hendra Wijaya", "2026-06-06", 7, 25, "ON_TIME"),
  makeAttendance("a45", "e5", "Hendra Wijaya", "2026-06-05", 8, 2, "ON_TIME"),
  makeAttendance("a46", "e5", "Hendra Wijaya", "2026-06-04", 7, 18, "ON_TIME"),
  makeAttendance("a47", "e5", "Hendra Wijaya", "2026-06-03", 7, 22, "ON_TIME"),
  makeAttendance("a48", "e5", "Hendra Wijaya", "2026-06-02", 7, 15, "ON_TIME"),
  makeAttendance("a49", "e5", "Hendra Wijaya", "2026-06-01", 7, 30, "ON_TIME"),
  makeAttendance("a50", "e5", "Hendra Wijaya", "2026-05-30", 7, 12, "ON_TIME"),

  // Rina Oktaviani (e6)
  makeAttendance("a51", "e6", "Rina Oktaviani", "2026-06-09", 8, 45, "LATE"),
  makeAttendance("a52", "e6", "Rina Oktaviani", "2026-06-08", 7, 52, "ON_TIME"),
  makeAttendance("a53", "e6", "Rina Oktaviani", "2026-06-07", 9, 30, "VERY_LATE"),
  makeAttendance("a54", "e6", "Rina Oktaviani", "2026-06-06", 7, 48, "ON_TIME"),
  makeAttendance("a55", "e6", "Rina Oktaviani", "2026-06-05", 8, 20, "LATE"),
  makeAttendance("a56", "e6", "Rina Oktaviani", "2026-06-04", 7, 40, "ON_TIME"),
  makeAttendance("a57", "e6", "Rina Oktaviani", "2026-06-03", 8, 5, "ON_TIME"),
  makeAttendance("a58", "e6", "Rina Oktaviani", "2026-06-02", 7, 55, "ON_TIME"),
  makeAttendance("a59", "e6", "Rina Oktaviani", "2026-06-01", 8, 18, "LATE"),
  makeAttendance("a60", "e6", "Rina Oktaviani", "2026-05-30", 7, 30, "ON_TIME"),

  // Budi Santika (e7)
  makeAttendance("a61", "e7", "Budi Santika", "2026-06-09", 7, 58, "ON_TIME"),
  makeAttendance("a62", "e7", "Budi Santika", "2026-06-08", 8, 12, "LATE"),
  makeAttendance("a63", "e7", "Budi Santika", "2026-06-07", 7, 45, "ON_TIME"),
  makeAttendance("a64", "e7", "Budi Santika", "2026-06-06", 7, 50, "ON_TIME"),
  makeAttendance("a65", "e7", "Budi Santika", "2026-06-05", 8, 30, "LATE"),
  makeAttendance("a66", "e7", "Budi Santika", "2026-06-04", 7, 38, "ON_TIME"),
  makeAttendance("a67", "e7", "Budi Santika", "2026-06-03", 8, 5, "ON_TIME"),
  makeAttendance("a68", "e7", "Budi Santika", "2026-06-02", 7, 52, "ON_TIME"),
  makeAttendance("a69", "e7", "Budi Santika", "2026-06-01", 8, 8, "LATE"),
  makeAttendance("a70", "e7", "Budi Santika", "2026-05-30", 7, 25, "ON_TIME"),
];

// =============================================================================
// LEAVE REQUESTS
// =============================================================================
export const leaveRequests: LeaveRequest[] = [
  {
    id: "lr1", employeeId: "e1", employeeName: "Ahmad Fauzi",
    leaveTypeId: "lt1", leaveTypeName: "Cuti Tahunan", leaveTypeCode: "CT", colorCode: "#3B82F6",
    startDate: "2026-06-15", endDate: "2026-06-18", daysRequested: 4,
    reason: "Liburan keluarga ke Yogyakarta", halfDay: false,
    status: "PENDING",
    currentApproverId: "e3", currentApproverName: "Darmo Santoso",
    approvalHistory: [
      { level: 1, approverId: "e3", approverName: "Darmo Santoso", approverRole: "Supervisor", status: "PENDING" },
      { level: 2, approverId: "u1", approverName: "Dewi Lestari", approverRole: "HR Admin", status: "PENDING" },
    ],
    createdAt: "2026-06-05T10:00:00Z", updatedAt: "2026-06-05T10:00:00Z",
  },
  {
    id: "lr2", employeeId: "e2", employeeName: "Siti Rahma",
    leaveTypeId: "lt2", leaveTypeName: "Sakit", leaveTypeCode: "S", colorCode: "#EF4444",
    startDate: "2026-06-07", endDate: "2026-06-08", daysRequested: 2,
    reason: "Demam dan flu berat, perlu istirahat", halfDay: false,
    status: "APPROVED",
    currentApproverId: undefined, currentApproverName: undefined,
    approvalHistory: [
      { level: 1, approverId: "e4", approverName: "Ani Wijayanti", approverRole: "Supervisor", status: "APPROVED", actionAt: "2026-06-07T08:30:00Z", notes: "Disetujui, semoga cepat sembuh" },
    ],
    createdAt: "2026-06-07T07:00:00Z", updatedAt: "2026-06-07T08:30:00Z",
  },
  {
    id: "lr3", employeeId: "e6", employeeName: "Rina Oktaviani",
    leaveTypeId: "lt1", leaveTypeName: "Cuti Tahunan", leaveTypeCode: "CT", colorCode: "#3B82F6",
    startDate: "2026-06-20", endDate: "2026-06-26", daysRequested: 7,
    reason: "Cuti tahunan untuk acara keluarga", halfDay: false,
    status: "APPROVED_L1",
    currentApproverId: "u1", currentApproverName: "Dewi Lestari",
    approvalHistory: [
      { level: 1, approverId: "e5", approverName: "Hendra Wijaya", approverRole: "Supervisor", status: "APPROVED", actionAt: "2026-06-03T14:00:00Z" },
      { level: 2, approverId: "u1", approverName: "Dewi Lestari", approverRole: "HR Admin", status: "PENDING" },
    ],
    createdAt: "2026-06-01T09:00:00Z", updatedAt: "2026-06-03T14:00:00Z",
  },
  {
    id: "lr4", employeeId: "e7", employeeName: "Budi Santika",
    leaveTypeId: "lt3", leaveTypeName: "Izin Khusus", leaveTypeCode: "IK", colorCode: "#F59E0B",
    startDate: "2026-06-09", endDate: "2026-06-09", daysRequested: 1,
    reason: "Urusan mendesak di keluarga", halfDay: false,
    status: "PENDING",
    currentApproverId: "e5", currentApproverName: "Hendra Wijaya",
    approvalHistory: [
      { level: 1, approverId: "e5", approverName: "Hendra Wijaya", approverRole: "Supervisor", status: "PENDING" },
    ],
    createdAt: "2026-06-09T06:30:00Z", updatedAt: "2026-06-09T06:30:00Z",
  },
  {
    id: "lr5", employeeId: "e3", employeeName: "Darmo Santoso",
    leaveTypeId: "lt5", leaveTypeName: "Cuti Pernikahan", leaveTypeCode: "CP", colorCode: "#EC4899",
    startDate: "2026-06-12", endDate: "2026-06-14", daysRequested: 3,
    reason: "Pernikahan anak", halfDay: false, requiresAttachment: true,
    status: "APPROVED",
    approvalHistory: [
      { level: 1, approverId: "e5", approverName: "Hendra Wijaya", approverRole: "Supervisor", status: "APPROVED", actionAt: "2026-05-28T10:00:00Z" },
    ],
    createdAt: "2026-05-25T11:00:00Z", updatedAt: "2026-05-28T10:00:00Z",
  },
];

// =============================================================================
// GEO ZONES
// =============================================================================
export const geoZones: GeoZone[] = [
  {
    id: "gz1", zoneName: "Kantor Pusat HiFeed", zoneType: "OFFICE",
    latitude: -6.2088, longitude: 106.8456, radiusMeters: 100,
    address: "Jl. Raya Serang KM 12, Kab. Serang, Banten 42171",
    isActive: true,
  },
  {
    id: "gz2", zoneName: "Farm Lampung", zoneType: "OFFICE",
    latitude: -5.3625, longitude: 105.2398, radiusMeters: 100,
    address: "Jl. Trans Sumatra Km 45, Gunung Terang, Lampung",
    isActive: true,
  },
  {
    id: "gz3", zoneName: "Farm Bali", zoneType: "OFFICE",
    latitude: -8.5375, longitude: 115.2626, radiusMeters: 100,
    address: "Jl. Raya Canggu, Mengwi, Badung, Bali",
    isActive: true,
  },
  {
    id: "gz4", zoneName: "Remote Work Zone", zoneType: "REMOTE",
    latitude: -6.2, longitude: 106.8, radiusMeters: 1000,
    address: "Remote work allowance area (kota Serang)",
    isActive: true,
  },
];

// =============================================================================
// DASHBOARD STATS
// =============================================================================
export const adminStats: AdminDashboardStats = {
  totalEmployees: 7,
  presentToday: 6,
  lateToday: 2,
  onLeaveToday: 1,
  attendanceRate: 85.71,
  onTimeRate: 57.14,
  pendingLeaveRequests: 2,
  avgApprovalTimeHours: 4.5,
};

export function getEmployeeStats(empId: string): { attendanceRate: number; onTimeRate: number; lateCountThisMonth: number } {
  const empLogs = attendanceLogs.filter(a => a.employeeId === empId);
  const total = empLogs.length;
  if (total === 0) return { attendanceRate: 0, onTimeRate: 0, lateCountThisMonth: 0 };
  const present = empLogs.filter(a => a.clockInTime).length;
  const onTime = empLogs.filter(a => a.clockInFlag === "ON_TIME").length;
  const late = empLogs.filter(a => a.clockInFlag === "LATE" || a.clockInFlag === "VERY_LATE").length;
  return {
    attendanceRate: Math.round((present / total) * 100),
    onTimeRate: Math.round((onTime / total) * 100),
    lateCountThisMonth: late,
  };
}

export function getTodayAttendance(empId: string) {
  const today = "2026-06-09";
  return attendanceLogs.find(a => a.employeeId === empId && a.date === today);
}