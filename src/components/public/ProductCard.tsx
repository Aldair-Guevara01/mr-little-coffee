import { MenuProduct } from "@/types";
const symbols: Record<string, string> = { latte: "☕", croissant: "🥐", cold: "◒", cake: "🍰", espresso: "☕", cappuccino: "♨", flat: "☕", mocha: "♨", affogato: "◉", almond: "🥐", bread: "◒", chocolate: "◆" };
export function ProductCard({ product }: { product: MenuProduct }) {
  return <article className="productCard"><div className={`productVisual ${product.image}`}><span aria-hidden>{symbols[product.image] ?? "☕"}</span>{product.label && <b>{product.label}</b>}</div><div className="productCopy"><small>{product.category}</small><h3>{product.name}</h3><p>{product.description}</p><button className="textButton">Conocer más <span>→</span></button></div></article>;
}
