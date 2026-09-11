import { products } from "@/data";
import { ProductCard } from "@/components/public/ProductCard";

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
            <button type="button" className="goldButton" aria-disabled="true" title="Próximamente" style={{cursor:"not-allowed"}}>Explorar el menú</button>
            <button type="button" className="outlineButton" aria-disabled="true" title="Próximamente" style={{cursor:"not-allowed"}}>Reservar mesa</button>
          </div>
        </div>
        <div className="heroNote"><span>01</span><p>Granos seleccionados<br/><b>Experiencia inigualable</b></p></div>
      </section>

      <section className="section featured">
        <div className="sectionHeading">
          <div><span className="eyebrow">DESCUBRE</span><h2>Selección Signature</h2></div>
          <button type="button" aria-disabled="true" title="Próximamente" style={{color:"var(--light-gold)",background:"none",border:0,padding:0,fontSize:12,cursor:"not-allowed"}}>Ver menú completo →</button>
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
          <button type="button" className="outlineButton" aria-disabled="true" title="Próximamente" style={{cursor:"not-allowed"}}>Nuestra historia</button>
        </div>
      </section>
    </main>
  );
}
