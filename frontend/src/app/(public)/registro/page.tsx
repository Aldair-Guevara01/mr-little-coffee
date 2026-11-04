import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";
export default function Registro() { return <main className="bg-[#0d0c0b] px-5 py-12 sm:py-20"><Suspense fallback={<p role="status">Cargando registro…</p>}><RegisterForm /></Suspense></main>; }
