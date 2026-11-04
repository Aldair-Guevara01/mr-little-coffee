"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { loginHref } from "@/lib/auth";
import { errorStyle, secondary } from "./styles";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, ready, sessionError, refresh } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => { if (ready && !user && !sessionError) router.replace(loginHref(pathname)); }, [ready, user, sessionError, router, pathname]);
  if (sessionError) return <div className="mx-auto max-w-2xl space-y-4 px-6 py-20"><p className={errorStyle} role="alert">{sessionError}</p><button className={secondary} onClick={() => void refresh()}>Reintentar conexión</button><Link className="ml-4 text-[#d4ae6e]" href={loginHref(pathname)}>Ir a iniciar sesión</Link></div>;
  if (!ready || !user) return <p className="p-12 text-center text-[#e5d8c7]" role="status">Comprobando tu sesión…</p>;
  return <>{children}</>;
}
