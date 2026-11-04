"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Services supplied by the host app; the ERP never creates a second session. */
export type ErpUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "customer" | "admin";
};

export type ErpIntegration = {
  user: ErpUser | null;
  ready: boolean;
  sessionError: string;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  formatError: (error: unknown) => string;
  loginHref: (destination: string) => string;
  logo: ReactNode;
};

const ErpContext = createContext<ErpIntegration | null>(null);

export function ErpProvider({ value, children }: { value: ErpIntegration; children: ReactNode }) {
  return <ErpContext.Provider value={value}>{children}</ErpContext.Provider>;
}

export function useErp(): ErpIntegration {
  const integration = useContext(ErpContext);
  if (!integration) throw new Error("El ERP debe estar dentro de ErpProvider.");
  return integration;
}
