import { Suspense } from "react";
import { LoginForm } from "@/components/public/LoginForm";
export default function Login() { return <main className="bg-[#0d0c0b] px-5 py-12 sm:py-20"><Suspense fallback={<p role="status">Cargando acceso…</p>}><LoginForm /></Suspense></main>; }
