"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest, errorMessage } from "@/lib/api";
import { CatalogCategory, CatalogPage, CATALOG_PAGE_SIZE, catalogHref, readCatalogQuery } from "@/lib/catalog";
import { CatalogProductCard } from "./CatalogProductCard";

type Result = { key: string; data: CatalogPage | null; error: string | null };

export function MenuCatalog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = readCatalogQuery(searchParams);
  const { category, sort, page, error: parameterError } = query;
  const key = `${category}:${sort}:${page}`;
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setCategoryError(null);
    apiRequest<CatalogCategory[]>("/categories", { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setCategories(data); })
      .catch((error: unknown) => { if (!controller.signal.aborted) setCategoryError(errorMessage(error)); });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    if (parameterError) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ sort, page: String(page), pageSize: String(CATALOG_PAGE_SIZE) });
    if (category) params.set("category", category);
    setResult(null);
    apiRequest<CatalogPage>(`/products?${params}`, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, data, error: null });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setResult({ key, data: null, error: errorMessage(error) });
      });
    return () => controller.abort();
  }, [category, sort, page, key, retry, parameterError]);

  const current = !parameterError && result?.key === key ? result : null;
  const data = current?.data;
  const error = parameterError || current?.error;
  const loading = !parameterError && !current;
  const changeCategory = (nextCategory: string) => router.push(catalogHref({ category: nextCategory, sort, page: 1 }), { scroll: false });
  const changeSort = (nextSort: "featured" | "az") => router.push(catalogHref({ category, sort: nextSort, page: 1 }), { scroll: false });

  return (
    <div className="grid gap-8 px-5 pb-20 pt-5 md:grid-cols-[210px_minmax(0,1fr)] md:px-[5vw]">
      <aside aria-label="Categorías del menú">
        <h2 className="mb-3 text-lg">Categorías</h2>
        <div className="flex flex-wrap gap-2 md:flex-col">
          {[{ slug: "", name: "Todo" }, ...categories, { slug: "novedades", name: "Novedades" }].map((item) => (
            <button key={item.slug} type="button" aria-pressed={category === item.slug} onClick={() => changeCategory(item.slug)}
              className={`min-h-[44px] rounded border px-4 py-2 text-left text-sm ${category === item.slug ? "border-[var(--gold)] bg-[#4e371e] text-white" : "border-transparent text-[#bdb1a4] hover:border-[var(--border)]"}`}>
              {item.name}
            </button>
          ))}
        </div>
        {categoryError && <div role="alert" className="mt-4 text-sm text-[#edb1a7]"><p>No se pudieron cargar las categorías. {categoryError}</p><button type="button" className="min-h-[44px] underline" onClick={() => setRetry((value) => value + 1)}>Reintentar</button></div>}
      </aside>

      <section aria-label="Productos del menú" aria-busy={loading} className="min-w-0">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <p className="m-0 text-sm text-[#bdb1a4]" role="status">{loading ? "Cargando catálogo…" : data ? `${data.total} selecciones disponibles` : "Catálogo no disponible"}</p>
          <label className="flex items-center gap-3 text-sm" htmlFor="catalog-sort">Ordenar por
            <select id="catalog-sort" value={sort} onChange={(event) => changeSort(event.target.value as "featured" | "az")} className="min-h-[44px] rounded border border-[var(--border)] bg-[#17120f] px-3 text-[var(--cream)]">
              <option value="featured">Destacados</option><option value="az">Nombre A–Z</option>
            </select>
          </label>
        </div>

        {error && <div role="alert" className="rounded border border-[#a75045] bg-[#241512] p-6"><h2 className="text-2xl">No pudimos mostrar el menú</h2><p className="text-sm leading-6">{error}</p><div className="flex flex-wrap gap-4"><Link className="goldButton" href="/menu">Restablecer filtros</Link>{!parameterError && <button type="button" className="outlineButton" onClick={() => setRetry((value) => value + 1)}>Reintentar</button>}</div></div>}
        {loading && <div className="rounded border border-[var(--border)] p-10 text-center text-[#bdb1a4]" aria-hidden="true">Consultando productos…</div>}

        {data && <>
          {data.items.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{data.items.map((product) => <CatalogProductCard key={product.id} product={product} />)}</div> : (
            <div className="rounded border border-[var(--border)] p-8 text-center">
              <h2 className="text-2xl">{data.total > 0 ? "Esta página no tiene productos" : category ? "No hay productos en esta categoría" : "El catálogo está vacío"}</h2>
              <p className="text-sm text-[#bdb1a4]">{data.total > 0 ? "Vuelve a una página disponible del catálogo." : "Puedes consultar otra categoría o volver más tarde."}</p>
              <Link className="goldButton" href={data.total > 0 ? catalogHref({ category, sort, page: 1 }) : "/menu"}>{data.total > 0 ? "Ir a la primera página" : "Ver todo el menú"}</Link>
            </div>
          )}
          {data.totalPages > 0 && <nav aria-label="Paginación del menú" className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-6">
            {page > 1 ? <Link className="outlineButton !ml-0" scroll={false} href={catalogHref({ category, sort, page: Math.min(page - 1, data.totalPages) })}>← Anterior</Link> : <span className="text-sm text-[#9b8d80]">Primera página</span>}
            <span className="text-sm" aria-live="polite">Página {data.page} de {data.totalPages}</span>
            {page < data.totalPages ? <Link className="goldButton" scroll={false} href={catalogHref({ category, sort, page: page + 1 })}>Siguiente →</Link> : <span className="text-sm text-[#bdb1a4]">Fin del catálogo</span>}
          </nav>}
        </>}
      </section>
    </div>
  );
}
