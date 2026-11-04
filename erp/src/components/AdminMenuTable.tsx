"use client";
import { useState } from "react";
import { catalogPrice } from "../format";
import { AdminEmpty, AdminStatus, useAdminResource, type AdminProduct } from "./data";
export function AdminMenuTable() {
  const resource = useAdminResource<AdminProduct[]>("/admin/products");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const categories = Array.from(new Map(resource.data?.map((item) => [item.category.id, item.category])).values());
  const items = resource.data?.filter((item) => (!category || item.category.id === category) && item.name.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es"))) ?? [];
  return <><div className="adminFilters"><div className="tabs" aria-label="Categorías"><button className={category === "" ? "active" : ""} aria-pressed={category === ""} onClick={() => setCategory("")}>Todos</button>{categories.map((item) => <button key={item.id} className={category === item.id ? "active" : ""} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.name}</button>)}</div><label className="search"><span className="sr-only">Buscar producto</span><span aria-hidden="true">⌕</span><input placeholder="Buscar producto..." value={search} onChange={(event) => setSearch(event.target.value)} /></label></div><AdminStatus {...resource} />
    {resource.data && (items.length ? <div className="tableWrap"><table><thead><tr>{["Producto", "Categoría", "Estado", "Destacado", "Precio"].map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><b>{item.name}</b></td><td>{item.category.name}</td><td><span className={item.active ? "status ok" : "status bad"}>{item.active ? "Activo" : "Inactivo"}</span></td><td>{item.featured ? "Sí" : "No"}</td><td>{catalogPrice(item.priceCents)}</td></tr>)}</tbody></table><p className="pagination">Mostrando {items.length} de {resource.data.length} productos guardados.</p></div> : <AdminEmpty>No hay productos que coincidan con los filtros.</AdminEmpty>)}
  </>;
}
