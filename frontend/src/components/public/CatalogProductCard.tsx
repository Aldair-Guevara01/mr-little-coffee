import Image from "next/image";
import Link from "next/link";
import { CatalogProduct, catalogIllustrations, catalogPrice } from "@/lib/catalog";

export function CatalogIllustration({ product }: { product: Pick<CatalogProduct, "image" | "name" | "label"> }) {
  const localImage = product.image.startsWith("/") && !product.image.startsWith("//");
  return (
    <div className={`productVisual ${catalogIllustrations[product.image] ? product.image : ""}`}>
      {localImage ? (
        <Image src={product.image} alt={product.name} fill sizes="(max-width: 760px) 90vw, 33vw" className="object-cover" />
      ) : (
        <span role="img" aria-label={`Ilustración de ${product.name}`}>{catalogIllustrations[product.image] ?? "☕"}</span>
      )}
      {product.label && <b>{product.label}</b>}
    </div>
  );
}

export function CatalogProductCard({ product }: { product: CatalogProduct }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[#181411]">
      <CatalogIllustration product={product} />
      <div className="flex flex-1 flex-col p-5">
        <p className="mb-2 text-xs text-[var(--light-gold)]">{product.category.name}</p>
        <h2 className="mb-3 text-2xl">{product.name}</h2>
        <p className="mb-4 text-sm leading-6 text-[#bdb1a4]">{product.description}</p>
        <p className="mt-auto text-sm text-[var(--cream)]">{catalogPrice(product.priceCents)}</p>
        <Link className="inline-flex min-h-[44px] items-center gap-2 text-sm text-[var(--light-gold)]" href={`/menu/${product.slug}`} aria-label={`Conocer más sobre ${product.name}`}>
          Conocer más <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
