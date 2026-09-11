"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
const disabledLinks = ["Menú", "Reservas", "Eventos", "Nosotros", "Contacto", "Iniciar sesión"];
export function PublicHeader() {
  const [open, setOpen] = useState(false); const path = usePathname();
  const menuToggleRef = useRef<HTMLButtonElement>(null); const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const bodyOverflow = document.body.style.overflow; const documentOverflow = document.documentElement.style.overflow;
    const closeWithEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.body.style.overflow = "hidden"; document.documentElement.style.overflow = "hidden"; document.addEventListener("keydown", closeWithEscape);
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => { window.cancelAnimationFrame(focusFrame); document.body.style.overflow = bodyOverflow; document.documentElement.style.overflow = documentOverflow; document.removeEventListener("keydown", closeWithEscape); menuToggleRef.current?.focus(); };
  }, [open]);
  return <header className="publicHeader"><div className="logo" aria-label="Mr. Little Coffee"><Image src="/images/brand/mr-little-coffee-mascot.png" alt="" width={38} height={38}/><span>MR. LITTLE COFFEE</span></div><button ref={menuToggleRef} className="menuToggle" aria-label="Abrir navegación" aria-controls="public-mobile-drawer" aria-expanded={open} onClick={() => setOpen((isOpen) => !isOpen)}>☰</button>
    <nav id="public-mobile-drawer" className={open ? "nav open" : "nav"} aria-label="Navegación principal"><button ref={closeButtonRef} type="button" className="mobileMenuClose" aria-label="Cerrar menú" onClick={() => setOpen(false)}>×</button><Link href="/" aria-current={path === "/" ? "page" : undefined} onClick={() => setOpen(false)}>Inicio</Link>{disabledLinks.map((label) => <button key={label} type="button" className="navDisabled" aria-disabled="true" title="Próximamente">{label}</button>)}<button type="button" className="goldButton small navDisabled" aria-disabled="true" title="Próximamente">Registro</button></nav>{open && <button type="button" className="menuOverlay" aria-label="Cerrar menú" onClick={() => setOpen(false)}/>} 
    <style jsx>{`.navDisabled{padding:31px 0;color:inherit;background:none;border:0;border-bottom:1px solid transparent;font-size:inherit;cursor:not-allowed}.navDisabled.goldButton{padding:0 17px;border:1px solid var(--gold);color:#fff;background:linear-gradient(135deg,#c69a50,#9a6e2a);box-shadow:0 8px 24px rgba(184,137,61,.16)}.navDisabled.goldButton:hover{background:linear-gradient(135deg,#d8b16b,#ad7e32);transform:translateY(-1px)}:global(.mobileMenuClose),:global(.menuOverlay){display:none}@media(max-width:760px){.navDisabled:not(.goldButton){padding:15px 0}:global(.publicHeader .menuToggle){order:-1}:global(.publicHeader .logo){margin-left:auto}:global(.publicHeader .nav){position:fixed;inset:0 auto 0 0;left:0;right:auto;top:0;width:min(82vw,320px);max-width:320px;height:100dvh;min-height:100dvh;display:flex;flex-direction:column;align-items:stretch;gap:0;padding:18px 24px 28px;background:#100e0c;border:0;border-right:1px solid var(--border);transform:translateX(-100%);transition:transform .25s ease,visibility 0s linear .25s;visibility:hidden;pointer-events:none;overflow-x:hidden;overflow-y:auto;z-index:50}:global(.publicHeader .nav.open){transform:translateX(0);transition:transform .25s ease,visibility 0s linear 0s;visibility:visible;pointer-events:auto}:global(.mobileMenuClose){display:inline-grid;place-items:center;align-self:flex-end;width:40px;height:40px;margin:0 0 14px auto;padding:0;color:var(--light-gold);background:none;border:1px solid var(--border);border-radius:3px;font-size:28px;line-height:1}:global(.publicHeader .nav>a:not(.goldButton)),:global(.publicHeader .nav .navDisabled:not(.goldButton)){padding:15px 0;text-align:left}:global(.publicHeader .nav .navDisabled.goldButton){align-self:flex-start;margin-top:14px}:global(.menuOverlay){display:block;position:fixed;inset:0;width:100%;height:100dvh;padding:0;background:rgba(0,0,0,.68);border:0;z-index:40;cursor:pointer}}`}</style>
  </header>;
}
