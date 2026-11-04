import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogIllustration } from "@/components/public/CatalogProductCard";
import { ApiError, apiRequest } from "@/lib/api";
import { CatalogProduct, catalogPrice } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function ProductDetail({ params }: { params: { slug: string } }) {
  let product: CatalogProduct;
  try {
    product = await apiRequest<CatalogProduct>(`/products/${encodeURIComponent(params.slug)}`, { cache: "no-store" });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw new Error("No fue posible cargar el producto. Inténtalo de nuevo más tarde.");
  }

  return (
    <main className="menuPage px-6 py-12 md:px-[8vw] md:py-20">
      <Link href="/menu" className="mb-8 inline-flex min-h-[44px] items-center text-sm text-[var(--light-gold)]">← Volver al menú</Link>
      <article className="grid max-w-5xl gap-8 md:grid-cols-2 md:items-start">
        <div className="overflow-hidden rounded-lg border border-[var(--border)]"><CatalogIllustration product={product} /></div>
        <div>
          <Link href={`/menu?category=${product.category.slug}`} className="inline-flex min-h-[44px] items-center text-sm text-[var(--light-gold)]">{product.category.name}</Link>
          <h1 className="mb-5 text-4xl md:text-5xl">{product.name}</h1>
          <p className="mb-6 text-base leading-8 text-[#bdb1a4]">{product.description}</p>
          <p className="mb-8 text-xl">{catalogPrice(product.priceCents)}</p>
          <Link className="goldButton" href="/menu">Explorar el menú</Link>
        </div>
      </article>
    </main>
  );
}
