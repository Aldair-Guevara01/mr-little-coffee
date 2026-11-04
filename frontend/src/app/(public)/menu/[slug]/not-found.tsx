import Link from "next/link";

export default function ProductNotFound() {
  return <main className="menuPage px-6 py-24 text-center"><p className="eyebrow">PRODUCTO NO ENCONTRADO</p><h1 className="text-4xl">Esta selección no está disponible</h1><p className="mb-8 text-[#bdb1a4]">El producto no existe o ya no forma parte del catálogo activo.</p><Link className="goldButton" href="/menu">Volver al menú</Link></main>;
}
