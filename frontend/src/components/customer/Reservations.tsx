"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { formatReservation, Reservation, ReservationConfig } from "@/lib/reservations";
import { ProfileShell } from "./ProfileShell";
import { errorStyle, panel, primary, secondary, successStyle } from "@/components/auth/styles";

function CancelButton({ reservation, onCancel }: { reservation: Reservation; onCancel: (reservation: Reservation) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cancel = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await api<Reservation>("/reservations/" + encodeURIComponent(reservation.id) + "/cancel", { method: "POST" });
      onCancel(result);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  };
  if (reservation.status !== "confirmed" || new Date(reservation.startsAt).getTime() <= Date.now()) return null;
  return <div className="space-y-3"><button className={secondary} disabled={busy} onClick={() => void cancel()}>{busy ? "Cancelando…" : "Cancelar reserva"}</button>{error && <p className={errorStyle} role="alert">{error}</p>}</div>;
}
function ReservationCard({ reservation, timezone }: { reservation: Reservation; timezone: string }) {
  return <article className={panel}><div className="mb-4 flex flex-wrap items-start justify-between gap-2"><h3 className="m-0 text-2xl">{formatReservation(reservation.startsAt, timezone)}</h3><span className="rounded border border-[#b8893d]/50 px-3 py-1 text-xs">{reservation.status === "cancelled" ? "Cancelada" : "Confirmada"}</span></div><p className="text-sm text-[#c8b9a8]">{reservation.people} {reservation.people === 1 ? "persona" : "personas"} · Hora de {timezone}</p><Link className={secondary} href={"/perfil/reservas/" + encodeURIComponent(reservation.id)}>Ver detalle</Link></article>;
}
function ReservationList() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [timezone, setTimezone] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    Promise.all([api<Reservation[]>("/reservations", { signal: controller.signal }), api<ReservationConfig>("/reservations/config", { signal: controller.signal })]).then(([items, config]) => { setReservations(items); setTimezone(config.timezone); }).catch((failure: unknown) => { if (!controller.signal.aborted) setError(errorMessage(failure)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  const now = Date.now();
  const future = reservations.filter((item) => item.status === "confirmed" && new Date(item.startsAt).getTime() > now).sort((a,b) => a.startsAt.localeCompare(b.startsAt));
  const history = reservations.filter((item) => item.status !== "confirmed" || new Date(item.startsAt).getTime() <= now).sort((a,b) => b.startsAt.localeCompare(a.startsAt));
  return <><header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-4xl">Mis reservas</h1><p className="text-sm text-[#c8b9a8]">Tus próximas visitas e historial.</p></div><Link className={primary} href="/reservas">Nueva reserva</Link></header>
    {loading ? <p role="status">Cargando tus reservas…</p> : error ? <div className="space-y-4"><p className={errorStyle} role="alert">{error}</p><button className={secondary} onClick={() => setAttempt((value) => value + 1)}>Reintentar</button></div> : <div className="space-y-10"><section><h2 className="text-3xl">Próximas visitas</h2>{future.length ? <div className="grid gap-4 md:grid-cols-2">{future.map((item) => <ReservationCard key={item.id} reservation={item} timezone={timezone} />)}</div> : <p className="text-sm text-[#c8b9a8]">No tienes reservas futuras confirmadas.</p>}</section><section><h2 className="text-3xl">Historial y canceladas</h2>{history.length ? <div className="grid gap-4 md:grid-cols-2">{history.map((item) => <ReservationCard key={item.id} reservation={item} timezone={timezone} />)}</div> : <p className="text-sm text-[#c8b9a8]">Aún no hay reservas en tu historial.</p>}</section></div>}
  </>;
}
function Detail({ id }: { id: string }) {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [timezone, setTimezone] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [cancelled, setCancelled] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setCancelled(false);
    Promise.all([api<Reservation>("/reservations/" + encodeURIComponent(id), { signal: controller.signal }), api<ReservationConfig>("/reservations/config", { signal: controller.signal })]).then(([item, config]) => { setReservation(item); setTimezone(config.timezone); }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof ApiError && failure.status === 404 ? "No encontramos esta reserva en tu cuenta." : errorMessage(failure));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, attempt]);
  return <><Link className="mb-6 inline-block text-[#d4ae6e] underline" href="/perfil/reservas">← Volver a mis reservas</Link><h1 className="mb-8 text-4xl">Detalle de la reserva</h1>
    {loading ? <p role="status">Cargando reserva…</p> : error ? <div className="space-y-4"><p className={errorStyle} role="alert">{error}</p><button className={secondary} onClick={() => setAttempt((value) => value + 1)}>Reintentar</button></div> : reservation && <article className={panel + " max-w-2xl space-y-5"}><h2 className="text-3xl">{formatReservation(reservation.startsAt, timezone)}</h2><dl className="space-y-4 text-sm"><div><dt className="text-[#c8b9a8]">Personas</dt><dd className="m-0 mt-1">{reservation.people}</dd></div><div><dt className="text-[#c8b9a8]">Estado</dt><dd className="m-0 mt-1">{reservation.status === "confirmed" ? "Confirmada" : "Cancelada"}</dd></div><div><dt className="text-[#c8b9a8]">Zona horaria</dt><dd className="m-0 mt-1">{timezone}</dd></div><div><dt className="text-[#c8b9a8]">Referencia</dt><dd className="m-0 mt-1 break-all">{reservation.id}</dd></div></dl>
    {cancelled && <p className={successStyle} role="status">La reserva fue cancelada. El cupo quedó disponible de nuevo.</p>}
    <CancelButton reservation={reservation} onCancel={(updated) => { setReservation(updated); setCancelled(true); }} />
    <p className="text-sm text-[#c8b9a8]">Puedes cancelar hasta antes del inicio. Para cambiar de fecha u hora, cancela y crea una nueva reserva.</p></article>}
  </>;
}
export function CustomerReservations() { return <ProfileShell backToProfile><ReservationList /></ProfileShell>; }
export function ReservationDetail({ id }: { id: string }) { return <ProfileShell><Detail id={id} /></ProfileShell>; }
