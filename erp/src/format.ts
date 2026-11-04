export function catalogPrice(priceCents: number | null): string {
  return priceCents === null
    ? "Precio no disponible"
    : new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(priceCents / 100);
}
