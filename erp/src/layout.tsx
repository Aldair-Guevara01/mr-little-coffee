import "./styles/admin.css";
import type { ReactNode } from "react";
import { AdminShell } from "./components/AdminShell";
import { RequireAdmin } from "./components/RequireAdmin";

export default function ErpLayout({ children }: { children: ReactNode }) {
  return <RequireAdmin><AdminShell>{children}</AdminShell></RequireAdmin>;
}
