import Link from "next/link";
import Image from "next/image";
export function Logo({ admin = false }: { admin?: boolean }) {
  return <Link href="/" className="logo" aria-label="Mr. Little Coffee, inicio"><Image src="/images/brand/mr-little-coffee-mascot.png" alt="" width={38} height={38}/><span>MR. LITTLE COFFEE{admin && <small>ADMIN</small>}</span></Link>;
}
