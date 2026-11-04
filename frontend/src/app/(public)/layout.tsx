import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
export default function PublicLayout({children}:{children:React.ReactNode}){return <div className="publicSite"><PublicHeader/>{children}<PublicFooter/></div>}
