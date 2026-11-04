import Image from "next/image";

export type PublicEvent = { id: string; title: string; description: string; startsAt: string; image?: string | null };

const eventDate = new Intl.DateTimeFormat("es-SV", {
  dateStyle: "long", timeStyle: "short", timeZone: "America/El_Salvador",
});

export function EditorialPage({ eyebrow, title, intro, events }: { eyebrow: string; title: string; intro: string; events: PublicEvent[] }) {
  const now = Date.now();
  const ordered = [...events].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime() || a.id.localeCompare(b.id));
  const upcoming = ordered.filter((event) => new Date(event.startsAt).getTime() >= now);
  const past = ordered.filter((event) => new Date(event.startsAt).getTime() < now);

  return <main className="editorialPage">
    <header className="pageHero editorialHero"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{intro}</p></header>
    <p className="px-6 text-sm text-[#bdb1a4] md:px-[5vw]">Fechas y horas de El Salvador.</p>
    {[{ title: "Próximos eventos", items: upcoming, empty: "No hay próximos eventos publicados. Vuelve pronto para consultar la agenda." }, { title: "Eventos pasados", items: past, empty: "Todavía no hay eventos pasados publicados." }].map((group) => (
      <section key={group.title} className="px-6 pb-16 md:px-[5vw]" aria-label={group.title}>
        <h2 className="mb-6 text-3xl">{group.title}</h2>
        {group.items.length === 0 ? <p className="rounded border border-[var(--border)] p-6 text-sm text-[#bdb1a4]">{group.empty}</p> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {group.items.map((event) => (
            <article key={event.id} className="overflow-hidden rounded-lg border border-[var(--border)] bg-[#171310]">
              {event.image?.startsWith("/") && !event.image.startsWith("//") ? <div className="relative h-48"><Image src={event.image} fill sizes="(max-width: 760px) 90vw, 33vw" alt="" className="object-cover" /></div> : <div className="editorialArt" aria-hidden="true">✦</div>}
              <div className="p-5"><time className="text-xs text-[var(--light-gold)]" dateTime={event.startsAt}>{eventDate.format(new Date(event.startsAt))}</time><h3 className="my-3 text-2xl">{event.title}</h3><p className="mb-0 text-sm leading-6 text-[#bdb1a4]">{event.description}</p></div>
            </article>
          ))}
        </div>}
      </section>
    ))}
  </main>;
}
