"use client";

import { useMemo, type ReactNode } from "react";
import { ErpProvider, type ErpIntegration } from "@mr-little-coffee/erp/integration";
import { Logo } from "@/components/shared/Logo";
import { useAuth } from "@/hooks/useAuth";
import { api, errorMessage } from "@/lib/api";
import { loginHref } from "@/lib/auth";

const logo = <Logo admin />;

/** Connect the ERP to the existing API client and the single AuthProvider. */
export function ErpBridge({ children }: { children: ReactNode }) {
  const { user, ready, sessionError, refresh, logout } = useAuth();
  const value = useMemo<ErpIntegration>(() => ({
    user, ready, sessionError, refresh, logout,
    request: api,
    formatError: errorMessage,
    loginHref,
    logo,
  }), [user, ready, sessionError, refresh, logout]);

  return <ErpProvider value={value}>{children}</ErpProvider>;
}
