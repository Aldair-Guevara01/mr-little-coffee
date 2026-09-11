import Link from "next/link";
import Image from "next/image";
export default function AccesoDenegado(){return <main className="deniedPage"><Image src="/images/brand/mr-little-coffee-mascot.png" alt="Mascota Mr. Little Coffee" width={150} height={150}/><span className="eyebrow">ACCESO RESTRINGIDO</span><h1>No tienes permisos para acceder al panel administrativo.</h1><p>Esta zona está reservada para la cuenta administrativa de demostración.</p><Link className="goldButton" href="/perfil">Volver a mi perfil</Link></main>}
