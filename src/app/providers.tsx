"use client";
import { DemoAuthProvider } from "@/context/DemoAuthContext";
export function Providers({children}:{children:React.ReactNode}){return <DemoAuthProvider>{children}</DemoAuthProvider>}
