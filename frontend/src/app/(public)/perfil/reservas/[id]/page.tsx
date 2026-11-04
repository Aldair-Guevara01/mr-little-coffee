import { ReservationDetail } from "@/components/customer/Reservations";
export default function DetalleReserva({ params }: { params: { id: string } }) { return <ReservationDetail id={params.id} />; }
