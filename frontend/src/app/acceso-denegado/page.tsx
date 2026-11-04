import Link from "next/link";
export default function AccesoDenegado() { return <main className="deniedPage"><h1>Acceso restringido</h1><p>Inicia sesión para acceder a tu perfil y tus reservas.</p><Link className="goldButton" href="/login">Iniciar sesión</Link></main>; }
