import { products } from "@/data";
import { ProductCard } from "@/components/public/ProductCard";
import Link from "next/link";

export default function Home() {
  const benefits = [
    ["♧", "Granos de origen", "Seleccionados a mano"],
    ["⌂", "Ambiente exclusivo", "Diseñado para ti"],
    ["♙", "Baristas expertos", "Pasión en cada taza"],
    ["✦", "Calidad excepcional", "Más que un café"],
  ];

  return (
    <main>
      <section className="hero">
        <div className="heroContent">
          <span className="eyebrow">MR. LITTLE COFFEE · SAN SALVADOR</span>
          <h1>El pequeño café,<br/><em>con gran estilo.</em></h1>
          <p>Una experiencia premium servida con encanto.</p>
          <div>
            <Link className="goldButton" href="/menu">Explorar el menú</Link>
            <Link className="outlineButton" href="/reservas">Reservar mesa</Link>
          </div>
        </div>
        <div className="heroNote"><span>01</span><p>Granos seleccionados<br/><b>Experiencia inigualable</b></p></div>
      </section>

      <section className="section featured">
        <div className="sectionHeading">
          <div><span className="eyebrow">DESCUBRE</span><h2>Productos destacados</h2></div>
          <Link href="/menu" style={{color:"var(--light-gold)",fontSize:12}}>Ver menú completo →</Link>
        </div>
        <div className="productGrid featuredGrid">
          {products.filter((product) => product.featured).slice(0, 4).map((product) => <ProductCard product={product} key={product.id}/>)}
        </div>
      </section>

      <section className="benefits">
        {benefits.map(([icon, title, description]) => <div key={title}><span>{icon}</span><p><b>{title}</b><small>{description}</small></p></div>)}
      </section>

      <section className="section mascotStory">
        <img src="/images/brand/mr-little-coffee-mascot.png" alt="Mascota Mr. Little Coffee"/>
        <div>
          <span className="eyebrow">CONOCE A NUESTRO ANFITRIÓN</span>
          <h2>Pequeño en tamaño.<br/>Grande en personalidad.</h2>
          <p>Mr. Little Coffee nació para representar una hospitalidad impecable: elegante, cercana y siempre dispuesta a convertir una taza en un momento memorable.</p>
          <Link className="outlineButton" href="/nosotros">Nuestra historia</Link>
        </div>
      </section>
    </main>
  );
}
