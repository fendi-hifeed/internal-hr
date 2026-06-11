"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";
import { api } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Decode JWT exp from base64url payload (no signature verification needed)
function getTokenExp(token: string): number {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    const payload = JSON.parse(json);
    return (payload.exp || 0) * 1000; // ms
  } catch {
    return 0;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  // Logout helper — defined once, used by mount effect and refresh failure
  const doLogout = () => {
    setUser(null);
    setToken(null);
    setError(null);
    api.setToken(null);
    localStorage.removeItem("hr_auth_token");
    localStorage.removeItem("hr_auth_user");
    localStorage.removeItem("hr_auth_refresh_token");
    router.push("/hr/login");
  };

  // Refresh access token using stored refresh token
  const refreshAccessToken = async (): Promise<boolean> => {
    const storedRefresh = localStorage.getItem("hr_auth_refresh_token");
    if (!storedRefresh) return false;
    try {
      const newAccessToken = await api.refreshToken(storedRefresh);
      api.setToken(newAccessToken);
      setToken(newAccessToken);
      localStorage.setItem("hr_auth_token", newAccessToken);
      return true;
    } catch {
      doLogout();
      return false;
    }
  };

  // Schedule proactive refresh ~15min before expiry
  useEffect(() => {
    if (!token) return;
    const expMs = getTokenExp(token);
    const now = Date.now();
    const msUntilRefresh = expMs - now - 15 * 60 * 1000;
    if (msUntilRefresh > 0) {
      const t = setTimeout(() => refreshAccessToken(), msUntilRefresh);
      return () => clearTimeout(t);
    } else {
      // Already past refresh window — refresh now
      refreshAccessToken();
    }
  }, [token]);

  // Verify token with backend on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("hr_auth_token");
    const storedUser = localStorage.getItem("hr_auth_user");

    if (storedToken && storedUser) {
      try {
        api.setToken(storedToken);
        setToken(storedToken);
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);

        api.getMe()
          .then((backendUser) => {
            setUser(backendUser);
            localStorage.setItem("hr_auth_user", JSON.stringify(backendUser));
          })
          .catch(() => {
            // Token invalid/expired — try refresh first
            refreshAccessToken().catch(() => {
              doLogout();
            });
          })
          .finally(() => setIsInitialized(true));
      } catch {
        localStorage.removeItem("hr_auth_token");
        localStorage.removeItem("hr_auth_user");
        localStorage.removeItem("hr_auth_refresh_token");
        setIsInitialized(true);
      }
    } else {
      setIsInitialized(true);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.login(email.trim().toLowerCase(), password);
      api.setToken(data.token);
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("hr_auth_token", data.token);
      localStorage.setItem("hr_auth_user", JSON.stringify(data.user));
      // Also store refresh token if backend returns it
      const refreshToken = (data as any).refresh_token;
      if (refreshToken) {
        localStorage.setItem("hr_auth_refresh_token", refreshToken);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login gagal";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout: doLogout, isLoading, error, isInitialized }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}