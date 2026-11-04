"use client";

import Link from "next/link";

export default function ProductError({ reset }: { reset: () => void }) {
  return <main className="menuPage px-6 py-24 text-center"><h1 className="text-4xl">No pudimos cargar el producto</h1><p className="mb-8 text-[#bdb1a4]">El servicio no está disponible en este momento. Inténtalo nuevamente.</p><div className="flex flex-wrap justify-center gap-4"><button className="goldButton" type="button" onClick={reset}>Reintentar</button><Link className="outlineButton" href="/menu">Volver al menú</Link></div></main>;
}
