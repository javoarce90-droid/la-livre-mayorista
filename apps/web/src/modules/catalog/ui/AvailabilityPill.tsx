import { Badge, type Tone } from "@/shared/ui/Badge";
import type { Availability } from "../domain/book";
import { AVAILABILITY_LABEL } from "./messages";

const TONE: Record<Availability, Tone> = { immediate: "success", on_order: "warning", out_of_stock: "danger" };

export function AvailabilityPill({ availability }: { availability: Availability }) {
  return <Badge tone={TONE[availability]}>{AVAILABILITY_LABEL[availability]}</Badge>;
}
