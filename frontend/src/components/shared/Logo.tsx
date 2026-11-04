import Link from "next/link";
import Image from "next/image";
export function Logo({ admin = false, brandScript = false }: { admin?: boolean; brandScript?: boolean }) {
  return <Link href="/" className="logo" aria-label="Mr. Little Coffee, inicio"><Image src="/images/brand/mr-little-coffee-mascot.png" alt="" width={38} height={38}/><span className={brandScript ? "brandName" : undefined}>{brandScript ? "Mr. Little Coffee" : "MR. LITTLE COFFEE"}{admin && <small>ADMIN</small>}</span></Link>;
}
