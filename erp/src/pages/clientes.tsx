"use client";
import { AdminDirectory } from "../components/AdminDirectory";
import { adminDate, type AdminUser } from "../components/data";
export default function Clientes() { return <AdminDirectory<AdminUser> eyebrow="COMUNIDAD" title="Clientes y cuentas" description="Cuentas registradas y sus roles en la aplicación." endpoint="/admin/users" columns={["Nombre", "Correo", "Teléfono", "Rol", "Registro"]} row={(user) => ({ id: user.id, cells: [user.name, user.email, user.phone || "Sin teléfono", user.role === "admin" ? "Administrador" : "Cliente", adminDate(user.createdAt)] })} />; }