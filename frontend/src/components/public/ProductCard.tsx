import { MenuProduct } from "@/types";
import Link from "next/link";
import { homeProductSlugs } from "@/lib/catalog";
const symbols: Record<string, string> = { latte: "☕", croissant: "🥐", cold: "◒", cake: "🍰", espresso: "☕", cappuccino: "♨", flat: "☕", mocha: "♨", affogato: "◉", almond: "🥐", bread: "◒", chocolate: "◆" };
export function ProductCard({ product }: { product: MenuProduct }) {
  return <article className="productCard"><div className={`productVisual ${product.image}`}><span aria-hidden>{symbols[product.image] ?? "☕"}</span>{product.label && <b>{product.label}</b>}</div><div className="productCopy"><small>{product.category}</small><h3>{product.name}</h3><p>{product.description}</p><Link className="textButton" href={`/menu/${homeProductSlugs[product.id] ?? product.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}>Conocer más <span>→</span></Link></div></article>;
}
