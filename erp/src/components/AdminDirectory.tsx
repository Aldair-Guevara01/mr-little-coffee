"use client";
import { useState } from "react";
import { AdminEmpty, AdminStatus, ReadOnlyNotice, useAdminResource } from "./data";

type DirectoryRow = { id: string; cells: string[] };
export function AdminDirectory<T>({ eyebrow, title, description, endpoint, columns, row }: { eyebrow: string; title: string; description: string; endpoint: string; columns: string[]; row: (record: T) => DirectoryRow }) {
  const resource = useAdminResource<T[]>(endpoint);
  const [search, setSearch] = useState("");
  const rows = resource.data?.map(row).filter((record) => record.cells.some((cell) => cell.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es")))) ?? [];
  return <main className="adminContent"><header className="adminPageTitle"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div></header><ReadOnlyNotice /><section className="adminCard">
    <div className="adminFilters"><p className="m-0 self-center text-sm">{resource.data ? `${resource.data.length} registros guardados` : "Consulta administrativa"}</p><label className="search"><span className="sr-only">Buscar en {title}</span><span aria-hidden="true">⌕</span><input placeholder="Buscar..." value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
    <AdminStatus {...resource} />
    {resource.data && (rows.length ? <div className="tableWrap"><table><thead><tr>{columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((record) => <tr key={record.id}>{record.cells.map((cell, index) => <td key={index} className="max-w-sm whitespace-pre-wrap break-words">{index === 0 ? <b>{cell}</b> : cell}</td>)}</tr>)}</tbody></table></div> : <AdminEmpty>{search ? "No hay coincidencias con tu búsqueda." : "Todavía no hay registros."}</AdminEmpty>)}
  </section></main>;
}