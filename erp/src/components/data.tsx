"use client";

import { useEffect, useState } from "react";
import { useErp, type ErpUser } from "../integration";

export type AdminProduct = {
  id: string;
  name: string;
  category: { id: string; name: string };
  featured: boolean;
  priceCents: number | null;
  active: boolean;
  displayOrder: number;
};
export type AdminReservation = {
  id: string;
  startsAt: string;
  people: number;
  status: "confirmed" | "cancelled";
  createdAt: string;
  cancelledAt: string | null;
  user: Pick<ErpUser, "id" | "name" | "email">;
};
export type AdminUser = ErpUser & { createdAt: string };
export type AdminEvent = { id: string; title: string; description: string; startsAt: string; image: string | null; published: boolean };
export type AdminContact = { id: string; name: string; email: string; subject: string | null; message: string; createdAt: string };
export type AdminOverview = {
  products: { total: number; active: number };
  reservations: { total: number; confirmed: number; cancelled: number; upcoming: number };
  users: { total: number; customers: number; admins: number };
  events: { total: number; published: number };
  contacts: { total: number };
};

export function useAdminResource<T>(path: string) {
  const { request, formatError } = useErp();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setData(null);
    request<T>(path, { signal: controller.signal }).then((value) => {
      if (!controller.signal.aborted) setData(value);
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(formatError(failure));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, revision, request, formatError]);
  return { data, loading, error, retry: () => setRevision((current) => current + 1) };
}

export function AdminStatus({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  if (loading) return <p className="p-6 text-sm" role="status">Cargando datos del servicio…</p>;
  if (error) return <div className="space-y-4 p-6"><p className="text-sm text-red-800" role="alert">{error}</p><button className="goldButton" onClick={retry}>Reintentar</button></div>;
  return null;
}

export function AdminEmpty({ children = "Todavía no hay registros." }: { children?: React.ReactNode }) {
  return <p className="p-6 text-sm text-[#756b63]" role="status">{children}</p>;
}

export function ReadOnlyNotice() {
  return <p className="mb-5 rounded border border-[#e3dbd2] bg-white p-3 text-sm text-[#756b63]">Consulta de datos guardados. La edición administrativa se incorporará en una etapa posterior.</p>;
}

export function adminDate(value: string): string {
  return new Intl.DateTimeFormat("es-SV", { timeZone: "America/El_Salvador", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
