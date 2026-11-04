"use client";
import { AdminDirectory } from "../components/AdminDirectory";
import { adminDate, type AdminEvent } from "../components/data";
export default function EventosAdmin() { return <AdminDirectory<AdminEvent> eyebrow="AGENDA" title="Gestión de Eventos" description="Agenda guardada, con eventos publicados y borradores." endpoint="/admin/events" columns={["Evento", "Fecha · El Salvador", "Descripción", "Estado"]} row={(event) => ({ id: event.id, cells: [event.title, adminDate(event.startsAt), event.description, event.published ? "Publicado" : "Borrador"] })} />; }