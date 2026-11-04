"use client";

import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { User } from "@/types/auth";

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  sessionError: string;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  registerAccount: (data: { name: string; email: string; password: string }) => Promise<void>;
  updateProfile: (data: { name: string; phone: string | null }) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState("");
  // A late initial session lookup must never overwrite a newer login or logout.
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++revision.current;
    setSessionError("");
    try {
      const data = await api<{ user: User }>("/auth/me");
      if (current === revision.current) setUser(data.user);
    } catch (error) {
      if (current !== revision.current) return;
      setUser(null);
      if (!(error instanceof ApiError && error.status === 401)) setSessionError(errorMessage(error));
    } finally { if (current === revision.current) setReady(true); }
  }, []);

  const invalidate = useCallback(() => { ++revision.current; }, []);
  useEffect(() => {
    void refresh();
    const expired = () => { invalidate(); setUser(null); setSessionError(""); setReady(true); };
    window.addEventListener("coffee:session-expired", expired);
    return () => { invalidate(); window.removeEventListener("coffee:session-expired", expired); };
  }, [refresh, invalidate]);

  const login = async (email: string, password: string) => {
    const current = ++revision.current;
    const data = await api<{ user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    if (current === revision.current) { setUser(data.user); setReady(true); setSessionError(""); }
  };
  const registerAccount = async (values: { name: string; email: string; password: string }) => {
    const current = ++revision.current;
    const data = await api<{ user: User }>("/auth/register", { method: "POST", body: JSON.stringify(values) });
    if (current === revision.current) { setUser(data.user); setReady(true); setSessionError(""); }
  };
  const updateProfile = async (values: { name: string; phone: string | null }) => {
    const current = ++revision.current;
    const data = await api<{ user: User }>("/profile", { method: "PATCH", body: JSON.stringify(values) });
    if (current === revision.current) setUser(data.user);
  };
  const logout = async () => {
    ++revision.current;
    try { await api("/auth/logout", { method: "POST" }); }
    catch (error) { if (!(error instanceof ApiError && error.status === 401)) throw error; }
    setUser(null); setSessionError("");
  };

  return <AuthContext.Provider value={{ user, ready, sessionError, refresh, login, registerAccount, updateProfile, logout }}>{children}</AuthContext.Provider>;
}
