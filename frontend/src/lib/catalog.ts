export type CatalogCategory = { id: string; slug: string; name: string };

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  category: CatalogCategory;
  label: string | null;
  featured: boolean;
  priceCents: number | null;
};

export type CatalogPage = {
  items: CatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CatalogQuery = {
  category: string;
  sort: "featured" | "az";
  page: number;
  error: string | null;
};

export const CATALOG_PAGE_SIZE = 9;

/** The original catalog uses illustration keys, not stock photographs. */
export const catalogIllustrations: Record<string, string> = {
  latte: "☕", croissant: "🥐", cold: "◒", cake: "🍰", espresso: "☕",
  cappuccino: "♨", flat: "☕", mocha: "♨", affogato: "◉", almond: "🥐",
  bread: "◒", chocolate: "◆",
};

/** Stable links for the immutable, locally rendered Home selections. */
export const homeProductSlugs: Record<number, string> = {
  1: "latte-signature",
  2: "croissant-de-mantequilla",
  3: "cold-brew-special",
  4: "cheesecake-de-frutos-rojos",
};

export function catalogPrice(priceCents: number | null): string {
  return priceCents === null
    ? "Precio no disponible"
    : new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(priceCents / 100);
}

export function readCatalogQuery(params: Pick<URLSearchParams, "get" | "getAll">): CatalogQuery {
  const category = params.get("category") ?? "";
  const sort = params.get("sort") ?? "featured";
  const rawPage = params.get("page") ?? "1";
  const page = Number(rawPage);
  const duplicate = ["category", "sort", "page"].some((key) => params.getAll(key).length > 1);
  const invalid = duplicate || (category !== "" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category)) || category.length > 80
    || !["featured", "az"].includes(sort) || !/^[1-9]\d*$/.test(rawPage)
    || !Number.isSafeInteger(page) || page > 100000;
  return {
    category,
    sort: sort === "az" ? "az" : "featured",
    page: invalid ? 1 : page,
    error: invalid ? "Los parámetros del menú no son válidos. Restablece los filtros para continuar." : null,
  };
}

export function catalogHref(query: Pick<CatalogQuery, "category" | "sort" | "page">): string {
  const params = new URLSearchParams();
  if (query.category) params.set("category", query.category);
  if (query.sort !== "featured") params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));
  return `/menu${params.size ? `?${params.toString()}` : ""}`;
}
