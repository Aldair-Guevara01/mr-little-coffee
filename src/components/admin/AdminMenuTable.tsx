"use client";
import { useState } from "react";
import { products } from "@/data";
export function AdminMenuTable(){
 const [items,setItems]=useState(products); const toggle=(id:number,key:"featured"|"available")=>setItems(x=>x.map(p=>p.id===id?{...p,[key]:!p[key]}:p));
 return <div className="tableWrap"><table><thead><tr><th>Producto</th><th>Categoría</th><th>Estado</th><th>Destacado</th><th>Disponible</th><th>Acciones</th></tr></thead><tbody>{items.slice(0,8).map(p=><tr key={p.id}><td><span className="miniProduct">☕</span><b>{p.name}</b></td><td>{p.category}</td><td><span className={p.available?"status ok":"status bad"}>{p.available?"Activo":"Inactivo"}</span></td><td><button className={p.featured?"switch on":"switch"} aria-label={`Cambiar destacado de ${p.name}`} onClick={()=>toggle(p.id,"featured")}><i/></button></td><td><button className={p.available?"switch on":"switch"} aria-label={`Cambiar disponibilidad de ${p.name}`} onClick={()=>toggle(p.id,"available")}><i/></button></td><td><button className="iconButton" aria-label={`Editar ${p.name}`}>✎</button> <button className="iconButton" aria-label={`Ver ${p.name}`}>⋮</button></td></tr>)}</tbody></table><div className="pagination"><span>Mostrando 1 a 8 de {items.length} productos</span><div><button>‹</button><button className="current">1</button><button>2</button><button>›</button></div></div></div>
}
