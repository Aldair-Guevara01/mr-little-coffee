"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/shared/Logo";
import { useDemoAuth } from "@/hooks/useDemoAuth";
import { useRouter } from "next/navigation";
const nav=[["▦","Dashboard","/admin"],["◇","Reservas","/admin/reservas"],["☕","Menú","/admin/menu"],["♙","Clientes","/admin/clientes"],["☆","Eventos","/admin/eventos"],["▤","Inventario","/admin/inventario"],["⌁","Reportes","/admin/reportes"],["⚙","Configuración","/admin/configuracion"]];
export function AdminShell({children}:{children:React.ReactNode}){
 const path=usePathname(),[open,setOpen]=useState(false),{logout}=useDemoAuth(),router=useRouter(); const exit=()=>{logout();router.push("/")};
 return <div className="adminShell"><aside className={open?"adminSidebar open":"adminSidebar"}><Logo admin/><span className="adminDemoBadge">Demo administrativa</span><nav>{nav.map(([icon,label,href])=>href?<Link key={label} href={href} onClick={()=>setOpen(false)} className={path===href?"active":""} aria-current={path===href?"page":undefined}><span>{icon}</span>{label}</Link>:<span className="disabled" key={label}><i>{icon}</i>{label}</span>)}</nav><button className="logout" onClick={exit}>↪ Cerrar sesión</button></aside><div className="adminMain"><header className="adminTopbar"><button className="adminToggle" onClick={()=>setOpen(!open)} aria-expanded={open}>☰</button><div><span>Administrador Mr. Little Coffee</span><img src="/images/brand/mr-little-coffee-mascot.png" alt=""/></div></header>{children}</div></div>
}
