"use client";
import Link from "next/link";
import { BarChart, Donut } from "../components/Charts";
import { adminDate, AdminEmpty, AdminStatus, useAdminResource, type AdminOverview, type AdminEvent } from "../components/data";

export default function Dashboard() {
  const overview = useAdminResource<AdminOverview>("/admin/overview");
  const events = useAdminResource<AdminEvent[]>("/admin/events");
  const data = overview.data;
  const upcoming = events.data?.filter((event) => event.published && new Date(event.startsAt).getTime() >= Date.now()).sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 5) ?? [];
  const metrics = data ? [
    { title: "Reservas guardadas", value: data.reservations.total, description: `${data.reservations.upcoming} confirmadas por venir`, icon: "◇", href: "/admin/reservas" },
    { title: "Clientes registrados", value: data.users.customers, description: `${data.users.admins} cuentas administrativas`, icon: "♙", href: "/admin/clientes" },
    { title: "Productos activos", value: data.products.active, description: `${data.products.total} productos en total`, icon: "☕", href: "/admin/menu" },
    { title: "Mensajes recibidos", value: data.contacts.total, description: "Formulario de contacto", icon: "✉", href: "/admin/contactos" },
  ] : [];
  return <main className="adminContent"><header className="adminPageTitle"><div><span className="eyebrow">VISTA GENERAL</span><h1>Resumen del negocio</h1><p>Conteos actuales de registros guardados en Mr. Little Coffee.</p></div></header><AdminStatus {...overview} />
    {data && <><section className="statGrid" aria-label="Resumen de registros">{metrics.map((metric) => <article className="statCard" key={metric.title}><span aria-hidden="true">{metric.icon}</span><p><Link href={metric.href}>{metric.title}</Link><strong>{metric.value}</strong><small>{metric.description}</small></p></article>)}</section>
      <section className="dashboardGrid"><article className="chartCard wide"><header><div><h2>Reservas por estado</h2><p>Todos los registros guardados</p></div></header>{data.reservations.total ? <BarChart data={[{ label: "Confirmadas", value: data.reservations.confirmed }, { label: "Canceladas", value: data.reservations.cancelled }]} /> : <AdminEmpty>Todavía no hay reservas.</AdminEmpty>}</article>
        <article className="chartCard"><header><div><h2>Catálogo activo</h2><p>{data.products.active} de {data.products.total} productos</p></div></header>{data.products.total ? <Donut value={Math.round(data.products.active / data.products.total * 100)} label="Activos" /> : <AdminEmpty>Todavía no hay productos.</AdminEmpty>}</article>
        <article className="chartCard eventsCard wide"><header><div><h2>Próximos eventos publicados</h2><p>{data.events.published} publicados de {data.events.total} guardados</p></div></header><AdminStatus {...events} />{events.data && (upcoming.length ? upcoming.map((event, index) => <div key={event.id}><span aria-hidden="true">{index + 1}</span><p><b>{event.title}</b><small>{adminDate(event.startsAt)}</small></p></div>) : <AdminEmpty>No hay próximos eventos publicados.</AdminEmpty>)}<Link className="mt-4 inline-block text-sm underline" href="/admin/eventos">Ver agenda completa</Link></article>
        <article className="chartCard"><h2>Alcance del panel</h2><p className="text-sm leading-6 text-[#756b63]">Puedes consultar catálogo, reservas, cuentas, eventos y mensajes. Las ventas, el inventario y los reportes operativos están pendientes de integración.</p></article>
      </section></>}
  </main>;
}