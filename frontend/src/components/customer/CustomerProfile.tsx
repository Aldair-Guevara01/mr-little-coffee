"use client";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { LogoutButton, ProfileShell } from "./ProfileShell";
import { panel, primary, secondary } from "@/components/auth/styles";

export function CustomerProfile() {
  const { user } = useAuth();
  return <ProfileShell>
    <header className="mb-8 flex flex-wrap items-start justify-between gap-6">
      <div><span className="text-xs tracking-widest text-[#d4ae6e]">TU ESPACIO PRIVADO</span>
        <h1 className="mt-3 text-4xl sm:text-5xl">Qué gusto verte, {user?.name.split(" ")[0]}.</h1>
        <p className="text-[#c8b9a8]">Organiza tus próximas visitas a Mr. Little Coffee.</p>
      </div>
      <div className="flex flex-wrap gap-3">{user?.role === "admin" && <Link className={secondary} href="/admin">Abrir ERP</Link>}<LogoutButton /></div>
    </header>
    <div className="grid gap-6 md:grid-cols-2">
      <section className={panel}><h2 className="text-3xl">Mi cuenta</h2>
        <dl className="mb-6 space-y-5 text-sm">
          <div><dt className="text-[#b8a798]">Nombre</dt><dd className="m-0 mt-1 break-words">{user?.name}</dd></div>
          <div><dt className="text-[#b8a798]">Correo electrónico</dt><dd className="m-0 mt-1 break-all">{user?.email}</dd></div>
          <div><dt className="text-[#b8a798]">Teléfono</dt><dd className="m-0 mt-1">{user?.phone || "Sin teléfono registrado"}</dd></div>
        </dl><Link className={secondary} href="/perfil/configuracion">Editar mis datos</Link>
      </section>
      <section className={panel}><h2 className="text-3xl">Tus reservas</h2>
        <p className="text-sm leading-7 text-[#c8b9a8]">Consulta tus próximas visitas y tu historial. Puedes cancelar una reserva confirmada hasta antes de su inicio.</p>
        <Link className={primary} href="/perfil/reservas">Ver mis reservas</Link>
      </section>
    </div>
  </ProfileShell>;
}
