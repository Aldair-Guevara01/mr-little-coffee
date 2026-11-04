"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
const navigationLinks = [
  ["Menú", "/menu"],
  ["Reservas", "/reservas"],
  ["Eventos", "/eventos"],
  ["Nosotros", "/nosotros"],
  ["Contacto", "/contacto"],
] as const;
export function PublicHeader() {
  const [open, setOpen] = useState(false); const path = usePathname();
  const { user, ready } = useAuth();
  const accountHref = user?.role === "admin" ? "/admin" : "/perfil";
  const menuToggleRef = useRef<HTMLButtonElement>(null); const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const menuToggle = menuToggleRef.current;
    const bodyOverflow = document.body.style.overflow; const documentOverflow = document.documentElement.style.overflow;
    const closeWithEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.body.style.overflow = "hidden"; document.documentElement.style.overflow = "hidden"; document.addEventListener("keydown", closeWithEscape);
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => { window.cancelAnimationFrame(focusFrame); document.body.style.overflow = bodyOverflow; document.documentElement.style.overflow = documentOverflow; document.removeEventListener("keydown", closeWithEscape); menuToggle?.focus(); };
  }, [open]);
  return <header className="publicHeader"><div className="logo" aria-label="Mr. Little Coffee"><Image src="/images/brand/mr-little-coffee-mascot.png" alt="" width={38} height={38}/><span className="brandName">Mr. Little Coffee</span></div><button ref={menuToggleRef} className="menuToggle" aria-label="Abrir navegación" aria-controls="public-mobile-drawer" aria-expanded={open} onClick={() => setOpen((isOpen) => !isOpen)}>☰</button>
    <nav id="public-mobile-drawer" className={open ? "nav open" : "nav"} aria-label="Navegación principal">
      <button ref={closeButtonRef} type="button" className="mobileMenuClose" aria-label="Cerrar menú" onClick={() => setOpen(false)}>×</button>
      <Link href="/" aria-current={path === "/" ? "page" : undefined} onClick={() => setOpen(false)}>Inicio</Link>
      {navigationLinks.map(([label, href]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>)}
      {!ready ? <span className="goldButton small" role="status" aria-live="polite">Comprobando…</span> : user ?
        <Link className="goldButton small navDisabled" href={accountHref} aria-current={path === accountHref ? "page" : undefined} style={{cursor:"pointer"}} onClick={() => setOpen(false)}>{user.role === "admin" ? "ERP" : "Mi cuenta"}</Link> :
        path !== "/login" && path !== "/registro" && <Link className="goldButton small navDisabled" href="/registro" style={{cursor:"pointer"}} onClick={() => setOpen(false)}>Registro</Link>}
    </nav>
    {open && <button type="button" className="menuOverlay" aria-label="Cerrar menú" onClick={() => setOpen(false)}/>}
  </header>;
}
