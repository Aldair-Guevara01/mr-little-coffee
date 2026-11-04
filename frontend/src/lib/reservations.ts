export type ReservationConfig = {
  timezone: string;
  openingHour: number;
  closingHour: number;
  slotMinutes: number;
  capacity: number;
  minPeople: number;
  maxPeople: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
};
export type AvailabilitySlot = { startsAt: string; time: string; available: boolean; remaining: number };
export type Availability = { date: string; timezone: string; slots: AvailabilitySlot[] };
export type Reservation = { id: string; startsAt: string; people: number; status: "confirmed" | "cancelled"; createdAt: string };

export function businessDate(timezone: string, date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function formatReservation(instant: string, timezone: string): string {
  return new Intl.DateTimeFormat("es-SV", { timeZone: timezone, dateStyle: "full", timeStyle: "short" }).format(new Date(instant));
}
