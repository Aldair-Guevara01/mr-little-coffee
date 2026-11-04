import type { ReactNode } from "react";
import ErpLayout from "@mr-little-coffee/erp/layout";
import { ErpBridge } from "@/components/erp/ErpBridge";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <ErpBridge><ErpLayout>{children}</ErpLayout></ErpBridge>;
}
