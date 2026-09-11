"use client";
import { useMemo, useState } from "react";
import { products } from "@/data";
import { ProductCard } from "./ProductCard";
const categories = ["Todo", "Café clásico", "Café de especialidad", "Bebidas frías", "Pastelería", "Panadería", "Postres", "Novedades"];
export function MenuCatalog() {
  const [category, setCategory] = useState("Todo"); const [sort, setSort] = useState("featured");
  const visible = useMemo(() => products.filter(p => category === "Todo" || (category === "Novedades" ? p.label === "Nuevo" : p.category === category)).sort((a,b) => sort === "az" ? a.name.localeCompare(b.name) : Number(b.featured)-Number(a.featured)), [category, sort]);
  return <div className="catalog"><aside className="categoryList" aria-label="Categorías">{categories.map(c => <button key={c} className={category === c ? "active" : ""} onClick={() => setCategory(c)}>{c}</button>)}</aside><section><div className="catalogToolbar"><p>{visible.length} selecciones disponibles</p><label>Ordenar por <select value={sort} onChange={e => setSort(e.target.value)}><option value="featured">Destacados</option><option value="az">Nombre A–Z</option></select></label></div><div className="productGrid">{visible.map(p => <ProductCard product={p} key={p.id}/>)}</div></section></div>;
}
