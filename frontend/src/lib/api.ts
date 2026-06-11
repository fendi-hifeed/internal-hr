// Real API client — connects to FastAPI backend via nginx reverse proxy
// For local dev: set NEXT_PUBLIC_API_URL=http://127.0.0.1:8001 in .env.local
// For production: omit NEXT_PUBLIC_API_URL to use nginx proxy (same origin)
import type {
  User, AttendanceLog, LeaveType, LeaveBalance, LeaveRequest,
  GeoZone, AdminDashboardStats, AttendanceStats,
  ClearanceDashboardStats, ClearanceConfigItem, ClearanceItem,
  Resignation, ResignationDetail, ResignationStatus,
} from "./types";

// Default: use nginx proxy at same origin (https://hr.hifeed.co/api/)
// For local dev without nginx: set NEXT_PUBLIC_API_URL=http://127.0.0.1:8001
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Convert snake_case API response keys to camelCase
function toCamelCase(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
        toCamelCase(v),
      ])
    );
  }
  return obj;
}

let _token: string | null = null;

export const api = {
  setToken(token: string | null) {
    _token = token;
  },

  async _fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };
    if (_token) {
      headers["Authorization"] = `Bearer ${_token}`;
    }
    const res = await fetch(`${BASE_URL}/api/v1${path}`, {
      ...options,
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    if (res.status === 204) return {} as T;
    return toCamelCase(await res.json()) as T;
  },

  // ---- Auth ----
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const data = await this._fetch<{
      access_token: string;
      user: User;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return { token: data.access_token, user: data.user };
  },

  async getMe(): Promise<User> {
    return this._fetch<User>("/auth/me");
  },

  async refreshToken(refreshToken: string): Promise<string> {
    const data = await this._fetch<{ access_token: string }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    return data.access_token;
  },

  // ---- Attendance ----
  async getTodayAttendance(): Promise<AttendanceLog | null> {
    return this._fetch<AttendanceLog | null>("/attendance/today");
  },

  async clockIn(data: {
    photo?: string;
    latitude: number;
    longitude: number;
    location_name?: string;
    idempotency_key: string;
    device_id?: string;
  }): Promise<AttendanceLog> {
    return this._fetch<AttendanceLog>("/attendance/clock-in", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async clockOut(data: {
    photo?: string;
    latitude: number;
    longitude: number;
    location_name?: string;
    idempotency_key: string;
    notes?: string;
    device_id?: string;
  }): Promise<AttendanceLog> {
    return this._fetch<AttendanceLog>("/attendance/clock-out", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getAttendanceHistory(page = 1, limit = 20): Promise<{ logs: AttendanceLog[]; total: number }> {
    const data = await this._fetch<AttendanceLog[]>("/attendance/history", {
      headers: { "Content-Type": "application/json" },
    });
    return { logs: data, total: data.length };
  },

  async getPersonalStats(year?: number, month?: number): Promise<AttendanceStats> {
    const params = new URLSearchParams();
    if (year) params.set("year", String(year));
    if (month) params.set("month", String(month));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this._fetch<AttendanceStats>(`/attendance/stats/personal${qs}`);
  },

  async getAdminStats(): Promise<AdminDashboardStats> {
    return this._fetch<AdminDashboardStats>("/attendance/stats/admin");
  },

  // ---- Leave ----
  async getLeaveTypes(): Promise<LeaveType[]> {
    return this._fetch<LeaveType[]>("/leave/types");
  },

  async getLeaveBalances(year?: number): Promise<LeaveBalance[]> {
    const qs = year ? `?year=${year}` : "";
    return this._fetch<LeaveBalance[]>(`/leave/balance${qs}`);
  },

  async getLeaveRequests(): Promise<LeaveRequest[]> {
    return this._fetch<LeaveRequest[]>("/leave/my-requests");
  },

  async getAllLeaveRequests(): Promise<LeaveRequest[]> {
    return this._fetch<LeaveRequest[]>("/leave/all");
  },

  async getPendingLeaveRequests(): Promise<LeaveRequest[]> {
    return this._fetch<LeaveRequest[]>("/leave/pending");
  },

  async requestLeave(data: {
    leave_type_id: string;
    start_date: string;
    end_date: string;
    reason: string;
    attachment_url?: string;
    half_day?: boolean;
    half_day_type?: string;
    idempotency_key?: string;
  }): Promise<LeaveRequest> {
    return this._fetch<LeaveRequest>("/leave/request", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async approveLeave(requestId: string, version: number, notes?: string): Promise<LeaveRequest> {
    return this._fetch<LeaveRequest>(`/leave/${requestId}/approve`, {
      method: "POST",
      body: JSON.stringify({ version, notes }),
    });
  },

  async rejectLeave(requestId: string, version: number, notes?: string): Promise<LeaveRequest> {
    return this._fetch<LeaveRequest>(`/leave/${requestId}/reject`, {
      method: "POST",
      body: JSON.stringify({ version, notes }),
    });
  },

  // ---- Leave Types Admin ----
  async getAllLeaveTypes(): Promise<LeaveType[]> {
    return this._fetch<LeaveType[]>("/leave/types");
  },

  async createLeaveType(data: Omit<LeaveType, "id">): Promise<LeaveType> {
    return this._fetch<LeaveType>("/leave/types", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateLeaveType(id: string, data: Partial<LeaveType>): Promise<LeaveType> {
    return this._fetch<LeaveType>(`/leave/types/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteLeaveType(id: string): Promise<void> {
    return this._fetch<void>(`/leave/types/${id}`, { method: "DELETE" });
  },

  // ---- Admin ----
  async getEmployees(): Promise<User[]> {
    return this._fetch<User[]>("/admin/employees");
  },

  async createEmployee(data: {
    name: string;
    email: string;
    password: string;
    role: string;
    department?: string;
    supervisor_id?: string;
  }): Promise<User> {
    return this._fetch<User>("/admin/employees", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateEmployee(id: string, data: Partial<User>): Promise<User> {
    return this._fetch<User>(`/admin/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async getGeoZones(): Promise<GeoZone[]> {
    return this._fetch<GeoZone[]>("/admin/geo-zones");
  },

  async createGeoZone(data: Omit<GeoZone, "id">): Promise<GeoZone> {
    return this._fetch<GeoZone>("/admin/geo-zones", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateGeoZone(id: string, data: Partial<GeoZone>): Promise<GeoZone> {
    return this._fetch<GeoZone>(`/admin/geo-zones/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteGeoZone(id: string): Promise<void> {
    return this._fetch<void>(`/admin/geo-zones/${id}`, { method: "DELETE" });
  },

  // ---- Clearance & Resignation ----
  async getClearanceStats(): Promise<ClearanceDashboardStats> {
    return this._fetch<ClearanceDashboardStats>("/clearance/stats");
  },

  // Config items (HR setup)
  async getClearanceConfig(includeInactive = false): Promise<ClearanceConfigItem[]> {
    const qs = includeInactive ? "?include_inactive=true" : "";
    return this._fetch<ClearanceConfigItem[]>(`/clearance/config${qs}`);
  },

  async createClearanceConfigItem(data: Omit<ClearanceConfigItem, "id" | "createdAt">): Promise<ClearanceConfigItem> {
    return this._fetch<ClearanceConfigItem>("/clearance/config", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateClearanceConfigItem(id: string, data: Partial<ClearanceConfigItem>): Promise<ClearanceConfigItem> {
    return this._fetch<ClearanceConfigItem>(`/clearance/config/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteClearanceConfigItem(id: string): Promise<void> {
    return this._fetch<void>(`/clearance/config/${id}`, { method: "DELETE" });
  },

  async reorderClearanceConfig(items: { id: string; orderIndex: number }[]): Promise<void> {
    return this._fetch<void>("/clearance/config/reorder", {
      method: "POST",
      body: JSON.stringify(items),
    });
  },

  // Resignations
  async getResignations(statusFilter?: ResignationStatus): Promise<Resignation[]> {
    const qs = statusFilter ? `?status_filter=${statusFilter}` : "";
    return this._fetch<Resignation[]>(`/clearance/resignations${qs}`);
  },

  async getResignation(id: string): Promise<ResignationDetail> {
    return this._fetch<ResignationDetail>(`/clearance/resignations/${id}`);
  },

  async createResignation(data: {
    employeeId: string;
    resignationDate: string;
    lastWorkDate: string;
    reason?: string;
  }): Promise<Resignation> {
    return this._fetch<Resignation>("/clearance/resignations", {
      method: "POST",
      body: JSON.stringify({
        employee_id: data.employeeId,
        resignation_date: data.resignationDate,
        last_work_date: data.lastWorkDate,
        reason: data.reason,
      }),
    });
  },

  async approveResignation(id: string, notes?: string): Promise<{ message: string }> {
    return this._fetch<{ message: string }>(`/clearance/resignations/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
  },

  async completeResignation(id: string): Promise<{ message: string }> {
    return this._fetch<{ message: string }>(`/clearance/resignations/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  async cancelResignation(id: string, notes?: string): Promise<{ message: string }> {
    return this._fetch<{ message: string }>(`/clearance/resignations/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
  },

  async getMyResignation(): Promise<ResignationDetail | null> {
    return this._fetch<ResignationDetail | null>("/clearance/my");
  },

  // Clearance items
  async getClearanceItems(resignationId: string): Promise<ClearanceItem[]> {
    return this._fetch<ClearanceItem[]>(`/clearance/resignations/${resignationId}/items`);
  },

  async completeClearanceItem(
    resignationId: string,
    itemId: string,
    data: { notes?: string; proofUrl?: string; waive?: boolean }
  ): Promise<ClearanceItem> {
    return this._fetch<ClearanceItem>(
      `/clearance/resignations/${resignationId}/items/${itemId}`,
      {
        method: "PUT",
        body: JSON.stringify({
          notes: data.notes,
          proof_url: data.proofUrl,
          waive: data.waive ?? false,
        }),
      }
    );
  },
};