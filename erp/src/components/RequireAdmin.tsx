"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useErp } from "../integration";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, ready, sessionError, refresh, loginHref } = useErp();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!ready || sessionError) return;
    if (!user) router.replace(loginHref(pathname));
    else if (user.role !== "admin") router.replace("/acceso-denegado");
  }, [ready, user, sessionError, pathname, router, loginHref]);
  if (sessionError) return <main className="loadingScreen"><p role="alert">{sessionError}</p><button className="goldButton" onClick={() => void refresh()}>Reintentar conexión</button><Link href={loginHref(pathname)}>Iniciar sesión</Link></main>;
  if (!ready || !user || user.role !== "admin") return <main className="loadingScreen"><p role="status">Comprobando acceso administrativo…</p></main>;
  return <>{children}</>;
}
