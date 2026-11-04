"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage } from "@/lib/api";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { errorStyle, secondary } from "@/components/auth/styles";

export function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const exit = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try { await logout(); router.replace("/"); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  };
  return <div className="space-y-3">
    <button type="button" className={secondary} disabled={busy} onClick={() => void exit()}>{busy ? "Cerrando…" : "Cerrar sesión"}</button>
    {error && <p className={errorStyle} role="alert">{error}</p>}
  </div>;
}

export function ProfileShell({ children, backToProfile = false }: { children: React.ReactNode; backToProfile?: boolean }) {
  return <RequireAuth><main className="mx-auto min-h-[60vh] max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
    {backToProfile && <Link className="mb-6 inline-block text-[#d4ae6e] underline" href="/perfil">← Volver a mi cuenta</Link>}
    {children}
  </main></RequireAuth>;
}
