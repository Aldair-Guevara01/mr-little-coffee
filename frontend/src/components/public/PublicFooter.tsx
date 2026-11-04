import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
export function PublicFooter() {
  return <footer className="footer"><div><Logo brandScript/><p>El pequeño café con gran estilo: origen, hospitalidad y momentos que permanecen.</p></div><div><h3>Descubre</h3><Link href="/menu">Nuestro menú</Link><Link href="/reservas">Reservas</Link><Link href="/nosotros">Nosotros</Link></div><div><h3>Visítanos</h3><p>Lun–Dom · 7:00–21:00</p><p>San Salvador · +503 2200 1840</p><p>hola@mrlittlecoffee.com</p></div><div><h3>Síguenos</h3><p>Instagram · Facebook · TikTok</p></div><small>© 2026 Mr. Little Coffee. Todos los derechos reservados.</small></footer>;
}
