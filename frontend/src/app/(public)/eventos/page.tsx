import { EditorialPage, PublicEvent } from "@/components/public/EditorialPage";
import { apiRequest } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Eventos() {
  const events = await apiRequest<PublicEvent[]>("/events", { cache: "no-store" });
  return <EditorialPage eyebrow="AGENDA MR. LITTLE" title="Noches que dejan huella" intro="Música, arte y café se encuentran en una agenda cultural cuidadosamente seleccionada." events={events} />;
}
