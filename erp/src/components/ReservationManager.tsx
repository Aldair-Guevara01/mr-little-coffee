"use client";
import { useState } from "react";
import { adminDate, AdminEmpty, AdminStatus, useAdminResource, type AdminReservation } from "./data";
const filters = [["all", "Todas"], ["confirmed", "Confirmadas"], ["cancelled", "Canceladas"]];
export function ReservationManager() {
  const resource = useAdminResource<AdminReservation[]>("/admin/reservations");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const items = resource.data?.filter((item) => (filter === "all" || item.status === filter) && `${item.user.name} ${item.user.email}`.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es"))) ?? [];
  return <><div className="adminFilters"><div className="tabs" aria-label="Estado de reserva">{filters.map(([value, label]) => <button key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={filter === value ? "active" : ""}>{label}</button>)}</div><label className="search"><span className="sr-only">Buscar reserva por cliente</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente..." /></label></div><AdminStatus {...resource} />
  {resource.data && (items.length ? <div className="tableWrap"><table><thead><tr>{["Fecha y hora · El Salvador", "Cliente", "Correo", "Personas", "Estado", "Creada"].map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><b>{adminDate(item.startsAt)}</b></td><td>{item.user.name}</td><td>{item.user.email}</td><td>{item.people}</td><td><span className={item.status === "confirmed" ? "status ok" : "status bad"}>{item.status === "confirmed" ? "Confirmada" : "Cancelada"}</span></td><td>{adminDate(item.createdAt)}</td></tr>)}</tbody></table><p className="pagination">{items.length} reservas visibles de {resource.data.length} guardadas.</p></div> : <AdminEmpty>No hay reservas que coincidan con los filtros.</AdminEmpty>)}</>;
}