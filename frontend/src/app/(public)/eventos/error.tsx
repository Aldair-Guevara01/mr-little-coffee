"use client";

export default function EventsError({ reset }: { reset: () => void }) {
  return <main className="editorialPage px-6 py-24 text-center"><h1 className="text-4xl">La agenda no está disponible</h1><p className="mb-8 text-[#bdb1a4]">No pudimos consultar los eventos. Inténtalo nuevamente.</p><button type="button" className="goldButton" onClick={reset}>Reintentar</button></main>;
}
