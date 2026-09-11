import Link from "next/link";
type Item={title:string;description:string;meta:string};
export function EditorialPage({eyebrow,title,intro,items}:{eyebrow:string;title:string;intro:string;items:Item[]}){
 return <main className="editorialPage"><header className="pageHero editorialHero"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{intro}</p></header><section className="editorialGrid">{items.map((item,index)=><article key={item.title}><span>0{index+1}</span><div className="editorialArt">✦</div><small>{item.meta}</small><h2>{item.title}</h2><p>{item.description}</p><Link className="textButton" href="/reservas">Consultar evento →</Link></article>)}</section></main>
}
