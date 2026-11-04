"use client";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api, ApiError, errorMessage } from "@/lib/api";
import { loginHref } from "@/lib/auth";
import { Availability, businessDate, formatReservation, Reservation, ReservationConfig } from "@/lib/reservations";
import { errorStyle, field, label, panel, primary, secondary, successStyle } from "@/components/auth/styles";

export function ReservationForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, ready } = useAuth();
  const [config, setConfig] = useState<ReservationConfig | null>(null);
  const [configError, setConfigError] = useState("");
  const [configAttempt, setConfigAttempt] = useState(0);
  const [availabilityResult, setAvailability] = useState<{ date: string; people: number; data: Availability } | null>(null);
  const [loading, setLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityAttempt, setAvailabilityAttempt] = useState(0);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<Reservation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false);
  const idempotency = useRef<{ selection: string; key: string } | null>(null);
  const date = params.get("date") || (config ? businessDate(config.timezone) : "");
  const people = Number(params.get("people") || "2");
  const selectedTime = params.get("time") || "";
  const validSelection = !!config && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isInteger(people) && people >= config.minPeople && people <= config.maxPeople;
  const selection = date + "|" + people + "|" + selectedTime;
  // Never confirm a slot returned for a different group while the new request loads.
  const availability = availabilityResult?.date === date && availabilityResult.people === people ? availabilityResult.data : null;
  const selectedSlot = availability && availability.date === date ? availability.slots.find((slot) => slot.time === selectedTime && slot.available) : undefined;
  const destination = "/reservas?" + new URLSearchParams({ date, people: String(people), ...(selectedTime ? { time: selectedTime } : {}) }).toString();

  useEffect(() => {
    const controller = new AbortController();
    setConfigError("");
    api<ReservationConfig>("/reservations/config", { signal: controller.signal }).then(setConfig).catch((failure: unknown) => { if (!controller.signal.aborted) setConfigError(errorMessage(failure)); });
    return () => controller.abort();
  }, [configAttempt]);
  useEffect(() => {
    setConfirmed(null); setError("");
  }, [selection]);
  useEffect(() => {
    if (!validSelection || !config) { setAvailability(null); return; }
    const controller = new AbortController();
    setLoading(true); setAvailability(null); setAvailabilityError("");
    const query = new URLSearchParams({ date, people: String(people) });
    api<Availability>("/reservations/availability?" + query.toString(), { signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) setAvailability({ date, people, data: result });
    }).catch((failure: unknown) => { if (!controller.signal.aborted) setAvailabilityError(errorMessage(failure)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [date, people, config, validSelection, availabilityAttempt]);

  const choose = (changes: { date?: string; people?: string; time?: string }) => {
    if (submitting) return;
    const next = new URLSearchParams({ date, people: String(people), ...(selectedTime ? { time: selectedTime } : {}) });
    Object.entries(changes).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key); });
    if ("date" in changes || "people" in changes) next.delete("time");
    if (next.toString() === destination.slice("/reservas?".length)) return;
    setError(""); setConfirmed(null);
    router.replace("/reservas?" + next.toString(), { scroll: false });
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (lock.current || confirmed) return;
    setError("");
    if (!selectedSlot || !validSelection || loading) { setError("Elige una franja disponible para tu grupo."); return; }
    if (!ready) return;
    if (!user) { router.push(loginHref(destination)); return; }
    lock.current = true; setSubmitting(true);
    if (!idempotency.current || idempotency.current.selection !== selection) idempotency.current = { selection, key: crypto.randomUUID() };
    try {
      const result = await api<Reservation>("/reservations", {
        method: "POST",
        headers: { "Idempotency-Key": idempotency.current.key },
        body: JSON.stringify({ startsAt: selectedSlot.startsAt, people }),
      });
      setConfirmed(result);
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) { router.push(loginHref(destination)); return; }
      setError(errorMessage(failure));
      if (failure instanceof ApiError && failure.status === 409) setAvailabilityAttempt((value) => value + 1);
    } finally { lock.current = false; setSubmitting(false); }
  };

  if (confirmed && config) return <section className={panel + " max-w-2xl space-y-5"} aria-labelledby="reservation-result">
    <h2 id="reservation-result" className="text-3xl">{confirmed.status === "confirmed" ? "Tu mesa está reservada" : "Esta reserva fue cancelada"}</h2>
    <p className={confirmed.status === "confirmed" ? successStyle : errorStyle} role="status">{confirmed.status === "confirmed" ? "Reserva confirmada" : "Reserva cancelada"} para {formatReservation(confirmed.startsAt, config.timezone)}, {confirmed.people} {confirmed.people === 1 ? "persona" : "personas"}.</p>
    <p className="text-sm text-[#c8b9a8]">Consulta el detalle y el estado de tu reserva en tu cuenta.</p>
    <div className="flex flex-wrap gap-3">
      <Link className={primary} href={"/perfil/reservas/" + encodeURIComponent(confirmed.id)}>Ver mi reserva</Link>
      <button type="button" className={secondary} onClick={() => { idempotency.current = null; setConfirmed(null); setAvailabilityAttempt((value) => value + 1); choose({ time: "" }); }}>Hacer otra reserva</button>
    </div>
  </section>;

  return <>{user && <div className="mb-6 flex justify-end"><Link className="text-sm text-[#d4ae6e] underline" href="/perfil/reservas">Mis reservas</Link></div>}
    {configError ? <div className="space-y-4"><p className={errorStyle} role="alert">{configError}</p><button className={secondary} onClick={() => setConfigAttempt((value) => value + 1)}>Reintentar</button></div> : !config ? <p role="status">Consultando horarios de reserva…</p> : <form onSubmit={(event) => void submit(event)} className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
      <section className={panel + " space-y-6"}><div><span className="text-xs tracking-widest text-[#d4ae6e]">01 · FECHA Y PERSONAS</span><h2 className="mt-2 text-3xl">¿Cuándo nos visitas?</h2></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className={label} htmlFor="booking-date">Fecha<input className={field} id="booking-date" type="date" value={date} min={businessDate(config.timezone)} max={businessDate(config.timezone, new Date(Date.now() + config.maxAdvanceDays * 86400000))} onChange={(event) => choose({ date: event.target.value })} required disabled={submitting} /></label>
        <label className={label} htmlFor="booking-people">Personas<select className={field} id="booking-people" value={Number.isInteger(people) ? people : ""} onChange={(event) => choose({ people: event.target.value })} disabled={submitting}><option value="" disabled>Elige tu grupo</option>{Array.from({ length: config.maxPeople - config.minPeople + 1 }, (_, index) => config.minPeople + index).map((count) => <option value={count} key={count}>{count} {count === 1 ? "persona" : "personas"}</option>)}</select></label></div>
        {!validSelection && <p className={errorStyle} role="alert">Revisa la fecha y elige entre {config.minPeople} y {config.maxPeople} personas.</p>}
        <fieldset disabled={submitting || loading} className="m-0 min-w-0 border-0 p-0"><legend className="mb-3 text-base font-semibold">02 · Hora disponible</legend>
          {loading ? <p role="status">Consultando disponibilidad…</p> : availabilityError ? <div className="space-y-3"><p className={errorStyle} role="alert">{availabilityError}</p><button type="button" className={secondary} onClick={() => setAvailabilityAttempt((value) => value + 1)}>Reintentar disponibilidad</button></div> : availability && (availability.slots.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{availability.slots.map((slot) => <button type="button" key={slot.startsAt} disabled={!slot.available} aria-pressed={slot.time === selectedTime} onClick={() => choose({ time: slot.time })} className={"min-h-16 rounded border p-3 text-sm disabled:cursor-not-allowed disabled:opacity-40 " + (slot.time === selectedTime ? "border-[#d4ae6e] bg-[#b8893d] font-bold text-[#0d0c0b]" : "border-[#907044] bg-[#0d0c0b] text-[#e5d8c7] hover:bg-[#30241b]")}><span className="block">{slot.time}</span><small className="mt-1 block text-xs">{slot.available ? slot.remaining + " cupos" : "No disponible"}</small></button>)}</div> : <p className="text-sm text-[#c8b9a8]">No hay franjas disponibles para esta fecha. Prueba otra fecha.</p>)}
        </fieldset>
        {availability && !availability.slots.some((slot) => slot.available) && availability.slots.length > 0 && <p role="status" className="text-sm text-[#c8b9a8]">No hay cupo para tu grupo en esta fecha. Elige otro día.</p>}
        <p className="text-xs leading-6 text-[#c8b9a8]">Horario diario: {String(config.openingHour).padStart(2, "0")}:00–{String(config.closingHour).padStart(2, "0")}:00. Franjas de {config.slotMinutes} minutos. Horas de {config.timezone}.</p>
      </section>
      <aside className={panel + " space-y-5"}><span className="text-xs tracking-widest text-[#d4ae6e]">TU PRÓXIMA VISITA</span><h2 className="text-3xl">Resumen</h2><dl className="space-y-4 text-sm"><div className="flex justify-between gap-3"><dt className="text-[#c8b9a8]">Fecha</dt><dd className="m-0">{date}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#c8b9a8]">Hora</dt><dd className="m-0">{selectedTime || "Por elegir"}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#c8b9a8]">Personas</dt><dd className="m-0">{Number.isInteger(people) ? people : "Por elegir"}</dd></div></dl>
        <p className="text-sm leading-6 text-[#c8b9a8]">Consulta el cupo para tu grupo. Puedes reservar con al menos {config.minNoticeMinutes} minutos de anticipación y hasta {config.maxAdvanceDays} días. La confirmación se realiza al guardar tu reserva.</p>
        <button className={primary + " w-full"} disabled={submitting || loading || !selectedSlot || !validSelection || !ready}>{submitting ? "Confirmando…" : !ready ? "Comprobando sesión…" : user ? "Confirmar reserva" : "Iniciar sesión para confirmar"}</button>
        {ready && !user && <p className="text-xs leading-6 text-[#c8b9a8]">Tu selección se conserva al iniciar sesión. Después podrás revisarla y confirmar.</p>}
        {error && <p className={errorStyle} role="alert">{error}</p>}
      </aside>
    </form>}
  </>;
}
