import { ContactForm } from "@/components/public/ContactForm";

export default function Contacto() {
  return <main className="contactPage">
    <header className="pageHero"><span className="eyebrow">HABLEMOS</span><h1>Estamos cerca de ti</h1><p>Visítanos o escríbenos. Mr. Little estará encantado de recibirte.</p></header>
    <section className="contactGrid" aria-label="Información de contacto y formulario">
      <div className="contactInfo"><h2>Mr. Little Coffee</h2><p>📍 Colonia Escalón, San Salvador</p><p>◷ Lunes a domingo · 7:00–21:00</p><p><a href="tel:+50322001840">☎ +503 2200 1840</a></p><p><a href="mailto:hola@mrlittlecoffee.com">✉ hola@mrlittlecoffee.com</a></p><div className="mapPlaceholder"><span>MR. LITTLE COFFEE</span><small>Referencia de ubicación · San Salvador</small></div></div>
      <ContactForm />
    </section>
  </main>;
}
