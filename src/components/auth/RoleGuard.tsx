"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDemoAuth } from "@/hooks/useDemoAuth";
import { UserRole } from "@/types/auth";
import Image from "next/image";
export function RoleGuard({role,children}:{role:UserRole;children:React.ReactNode}){
 const {user,isHydrated}=useDemoAuth(),router=useRouter();
 useEffect(()=>{if(!isHydrated)return;if(!user)router.replace("/login");else if(user.role!==role)router.replace(role==="admin"?"/acceso-denegado":"/admin")},[isHydrated,user,role,router]);
 if(!isHydrated||!user||user.role!==role)return <div className="loadingScreen"><Image src="/images/brand/mr-little-coffee-mascot.png" alt="" width={150} height={150}/><p>Preparando tu experiencia…</p></div>;
 return <>{children}</>
}
