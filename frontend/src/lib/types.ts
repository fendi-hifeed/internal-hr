// =============================================================================
// HR Presensi — Shared Types
// =============================================================================

export type UserRole = "HR_ADMIN" | "EMPLOYEE";

export type FlagStatus = "ON_TIME" | "LATE" | "VERY_LATE" | "ABSENT_FLAG";

export type LeaveStatus = "PENDING" | "APPROVED_L1" | "APPROVED" | "REJECTED" | "CANCELLED";

export type ApprovalLevel = "SINGLE" | "DOUBLE" | "MANAGEMENT";

export type QuotaUnit = "DAYS" | "HOURS";

export type GeoZoneType = "OFFICE" | "BRANCH" | "REMOTE";

// ---- User ----
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  supervisorId?: string;
  supervisorName?: string;
  joinDate: string;
  avatarUrl?: string;
  isActive: boolean;
}

// ---- Attendance ----
export interface AttendanceLog {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockInTime?: string;
  clockInPhoto?: string;
  clockInLatitude?: number;
  clockInLongitude?: number;
  clockInLocationName?: string;
  clockInFlag?: FlagStatus;
  clockOutTime?: string;
  clockOutPhoto?: string;
  clockOutLatitude?: number;
  clockOutLongitude?: number;
  clockOutLocationName?: string;
  clockOutNotes?: string;
  deviceId?: string;
  idempotencyKey?: string;
}

export interface AttendanceStats {
  totalWorkDays: number;
  presentDays: number;
  absentDays: number;
  onTimeCount: number;
  lateCount: number;
  veryLateCount: number;
  attendanceRate: number;
  onTimeRate: number;
  averageClockIn: string;
  lateCountThisMonth: number;
}

// ---- Leave Types ----
export interface LeaveType {
  id: string;
  typeName: string;
  typeCode: string;
  defaultQuota: number;
  quotaUnit: QuotaUnit;
  carryOverEnabled: boolean;
  carryOverMax?: number;
  requiresAttachment: boolean;
  minNoticeDays: number;
  approvalLevel: ApprovalLevel;
  isActive: boolean;
  colorCode: string;
  description?: string;
}

// ---- Leave Balance ----
export interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  colorCode: string;
  totalQuota: number;
  used: number;
  pending: number;
  available: number;
  quotaUnit: QuotaUnit;
}

// ---- Leave Request ----
export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  colorCode: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  reason: string;
  attachmentUrl?: string;
  halfDay: boolean;
  halfDayType?: "MORNING" | "AFTERNOON";
  status: LeaveStatus;
  currentApproverId?: string;
  currentApproverName?: string;
  approvalHistory: LeaveApproval[];
  createdAt: string;
  updatedAt: string;
}

export interface LeaveApproval {
  level: number;
  approverId: string;
  approverName: string;
  approverRole: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  actionAt?: string;
  notes?: string;
}

// ---- Geo Zone ----
export interface GeoZone {
  id: string;
  zoneName: string;
  zoneType: GeoZoneType;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  address: string;
  isActive: boolean;
}

// ---- Dashboard ----
export interface AdminDashboardStats {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  onLeaveToday: number;
  attendanceRate: number;
  onTimeRate: number;
  pendingLeaveRequests: number;
  avgApprovalTimeHours: number;
}

export interface EmployeeDashboardStats {
  employeeId: string;
  leaveBalances: LeaveBalance[];
  todayAttendance?: AttendanceLog;
  attendanceRate: number;
  onTimeRate: number;
  lateCountThisMonth: number;
}

// ---- Clearance & Resignation ----
export type ClearanceCategory = "IT_EQUIPMENT" | "DOCUMENTS" | "FINANCE" | "FACILITIES" | "HR_ADMIN" | "SUPERVISOR" | "OTHER";
export type ClearanceItemStatus = "PENDING" | "COMPLETED" | "WAIVED";
export type ResignationStatus = "PENDING" | "IN_PROGRESS" | "CLEARED" | "CANCELLED";
export type EmploymentStatus = "ACTIVE" | "RESIGNED" | "TERMINATED";

export const CATEGORY_LABELS: Record<ClearanceCategory, string> = {
  IT_EQUIPMENT: "IT & Peralatan",
  DOCUMENTS: "Dokumen",
  FINANCE: "Keuangan",
  FACILITIES: "Fasilitas",
  HR_ADMIN: "HR & Admin",
  SUPERVISOR: "Supervisor",
  OTHER: "Lainnya",
};

export const STATUS_LABELS: Record<ResignationStatus, string> = {
  PENDING: "Menunggu Persetujuan",
  IN_PROGRESS: "Sedang Clearance",
  CLEARED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const ITEM_STATUS_LABELS: Record<ClearanceItemStatus, string> = {
  PENDING: "Belum Selesai",
  COMPLETED: "Selesai",
  WAIVED: "Diwajibkan",
};

export interface ClearanceConfigItem {
  id: string;
  itemName: string;
  description?: string;
  category: ClearanceCategory;
  requiresProof: boolean;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
}

export interface Resignation {
  id: string;
  employeeId: string;
  employeeName?: string;
  resignationDate: string;
  lastWorkDate: string;
  reason?: string;
  status: ResignationStatus;
  initiatedBy: string;
  initiatorName?: string;
  approvedBy?: string;
  approverName?: string;
  approvedAt?: string;
  notes?: string;
  totalItems: number;
  completedItems: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClearanceItem {
  id: string;
  resignationId: string;
  configItemId?: string;
  itemName: string;
  itemCategory: ClearanceCategory;
  status: ClearanceItemStatus;
  completedBy?: string;
  completerName?: string;
  completedAt?: string;
  notes?: string;
  proofUrl?: string;
  requiresProof?: boolean;
  createdAt: string;
}

export interface ResignationDetail extends Resignation {
  clearanceItems: ClearanceItem[];
}

export interface ClearanceDashboardStats {
  pendingInitiations: number;
  inProgress: number;
  clearedThisMonth: number;
  totalActiveResignations: number;
}
