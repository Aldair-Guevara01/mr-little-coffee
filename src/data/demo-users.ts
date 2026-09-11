import { DemoUser } from "@/types/auth";
export const demoAccounts: Array<DemoUser & { password: string }> = [
  { id: "admin-demo", username: "admin", password: "1234", role: "admin", name: "Administrador Mr. Little Coffee" },
  { id: "customer-demo", username: "cliente", password: "1234", role: "customer", name: "Cliente Mr. Little Coffee", email: "cliente@mrlittlecoffee.com" }
];
