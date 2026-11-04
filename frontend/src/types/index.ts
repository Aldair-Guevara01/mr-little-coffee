export type MenuCategory = "Café clásico" | "Café de especialidad" | "Bebidas frías" | "Pastelería" | "Panadería" | "Postres";
export type MenuProduct = { id: number; name: string; category: MenuCategory; description: string; image: string; label?: "Especialidad" | "Nuevo" | "Recomendado"; available: boolean; featured: boolean; ingredients?: string };
export type ReservationStatus = "Confirmada" | "Pendiente" | "Completada" | "Cancelada";
export type Reservation = { id: number; time: string; client: string; contact: string; people: number; area: string; status: ReservationStatus };
export type InventoryStatus = "Óptimo" | "Bajo" | "Agotado" | "Reordenar pronto";
export type InventoryItem = { product: string; category: string; stock: number; unit: string; status: InventoryStatus };
