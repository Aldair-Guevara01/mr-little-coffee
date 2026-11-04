"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useErp } from "../integration";
import styles from "./admin.module.css";

const nav = [["▦", "Dashboard", "/admin"], ["◇", "Reservas", "/admin/reservas"], ["☕", "Menú", "/admin/menu"], ["♙", "Clientes", "/admin/clientes"], ["☆", "Eventos", "/admin/eventos"], ["✉", "Contactos", "/admin/contactos"], ["▤", "Inventario", "/admin/inventario"], ["⌁", "Reportes", "/admin/reportes"], ["⚙", "Configuración", "/admin/configuracion"]];
export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { logout, user, formatError, logo } = useErp();
  const router = useRouter();
  const exit = async () => {
    setBusy(true); setError("");
    try { await logout(); router.replace("/"); }
    catch (failure) { setError(formatError(failure)); }
    finally { setBusy(false); }
  };
  return <div className={`adminShell ${styles.erp}`}>
    <aside id="admin-sidebar" className={open ? "adminSidebar open" : "adminSidebar"}>
      {logo}<span className="adminDemoBadge">Panel administrativo</span>
      <nav aria-label="Administración">{nav.map(([icon, label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)} className={path === href ? "active" : ""} aria-current={path === href ? "page" : undefined}><span aria-hidden="true">{icon}</span>{label}</Link>)}</nav>
      <button className="logout" onClick={() => void exit()} disabled={busy}>{busy ? "Cerrando sesión…" : "↪ Cerrar sesión"}</button>
      {error && <p className="p-3 text-sm text-red-200" role="alert">{error}</p>}
    </aside>
    <div className={`adminMain ${styles.content}`}><header className="adminTopbar"><button className="adminToggle" onClick={() => setOpen(!open)} aria-label={open ? "Cerrar menú administrativo" : "Abrir menú administrativo"} aria-controls="admin-sidebar" aria-expanded={open}>☰</button><Link href="/">Ver sitio</Link><div><span>{user?.name} · Administración</span><Image src="/images/brand/mr-little-coffee-mascot.png" alt="" width={32} height={32} /></div></header>{children}</div>
  </div>;
}
