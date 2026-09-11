import { InventoryItem, MenuProduct, Reservation } from "@/types";

export const products: MenuProduct[] = [
  { id: 1, name: "Latte Signature", category: "Café de especialidad", description: "Suave espresso, leche sedosa y nuestro toque de cacao.", image: "latte", label: "Especialidad", available: true, featured: true, ingredients: "Espresso, leche y cacao" },
  { id: 2, name: "Croissant de mantequilla", category: "Panadería", description: "Hojaldrado artesanal, crujiente y delicadamente dorado.", image: "croissant", label: "Nuevo", available: true, featured: true },
  { id: 3, name: "Cold Brew Special", category: "Bebidas frías", description: "Infusión lenta, notas de chocolate y frescura intensa.", image: "cold", label: "Especialidad", available: true, featured: true },
  { id: 4, name: "Cheesecake de frutos rojos", category: "Postres", description: "Cremoso, delicado y terminado con frutos del bosque.", image: "cake", label: "Recomendado", available: true, featured: true },
  { id: 5, name: "Espresso Signature", category: "Café clásico", description: "Intenso y aromático, nuestro café en su forma más pura.", image: "espresso", available: true, featured: false },
  { id: 6, name: "Cappuccino Italiano", category: "Café clásico", description: "Espuma perfecta y balance delicado.", image: "cappuccino", label: "Especialidad", available: true, featured: true },
  { id: 7, name: "Flat White", category: "Café clásico", description: "Cuerpo sedoso y dulzor natural.", image: "flat", available: true, featured: false },
  { id: 8, name: "Mocha Deluxe", category: "Café de especialidad", description: "Chocolate belga y espresso de origen.", image: "mocha", available: false, featured: false },
  { id: 9, name: "Affogato", category: "Café de especialidad", description: "Helado de vainilla bañado en espresso.", image: "affogato", available: true, featured: false },
  { id: 10, name: "Croissant de almendras", category: "Pastelería", description: "Crujiente, tostado y suavemente dulce.", image: "almond", available: true, featured: false },
  { id: 11, name: "Pan de masa madre", category: "Panadería", description: "Fermentación lenta y corteza artesanal.", image: "bread", available: true, featured: false },
  { id: 12, name: "Tarta de chocolate", category: "Postres", description: "Cacao profundo y textura aterciopelada.", image: "chocolate", label: "Nuevo", available: true, featured: false }
];
export const reservations: Reservation[] = [
  { id: 1, time: "09:00", client: "Ana Martínez", contact: "ana@email.com", people: 2, area: "Terraza", status: "Confirmada" },
  { id: 2, time: "10:30", client: "Carlos López", contact: "carlos@email.com", people: 4, area: "Salón principal", status: "Confirmada" },
  { id: 3, time: "12:00", client: "María González", contact: "maria@email.com", people: 3, area: "Zona privada", status: "Pendiente" },
  { id: 4, time: "14:00", client: "José Ramírez", contact: "jose@email.com", people: 2, area: "Terraza", status: "Completada" },
  { id: 5, time: "16:00", client: "Pedro Sánchez", contact: "pedro@email.com", people: 6, area: "Zona privada", status: "Pendiente" },
  { id: 6, time: "18:30", client: "Laura Gómez", contact: "laura@email.com", people: 2, area: "Terraza", status: "Cancelada" }
];
export const inventory: InventoryItem[] = [
  { product: "Granos premium", category: "Café", stock: 24, unit: "kg", status: "Óptimo" },
  { product: "Leche entera", category: "Lácteos", stock: 10, unit: "L", status: "Óptimo" },
  { product: "Leche de almendra", category: "Lácteos", stock: 5, unit: "L", status: "Bajo" },
  { product: "Chocolate belga", category: "Insumos", stock: 4, unit: "kg", status: "Bajo" },
  { product: "Azúcar morena", category: "Insumos", stock: 10, unit: "kg", status: "Óptimo" },
  { product: "Croissants", category: "Panadería", stock: 15, unit: "ud", status: "Reordenar pronto" },
  { product: "Tazas desechables", category: "Suministros", stock: 120, unit: "ud", status: "Óptimo" }
];
