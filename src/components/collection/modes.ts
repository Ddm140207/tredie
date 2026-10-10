import { Clock, Coins, LayoutGrid, type LucideIcon } from "lucide-react";

export type HubMode = "grid" | "timeline" | "spending";

export interface HubModeDef {
  id: HubMode;
  label: string;
  icon: LucideIcon;
  href: string;
  /** Whether the current URL represents this mode. */
  match: (pathname: string, mode: HubMode | null) => boolean;
}

export const HUB_MODES: HubModeDef[] = [
  {
    id: "grid",
    label: "Grid",
    icon: LayoutGrid,
    href: "/home",
    match: (pathname, mode) => pathname === "/home" && mode !== "timeline" && mode !== "spending",
  },
  {
    id: "timeline",
    label: "Timeline",
    icon: Clock,
    href: "/timeline",
    match: (pathname) => pathname === "/timeline",
  },
  {
    id: "spending",
    label: "Spending",
    icon: Coins,
    href: "/home?mode=spending",
    match: (pathname, mode) => pathname === "/home" && mode === "spending",
  },
];

export function parseMode(value: string | null | undefined): HubMode | null {
  return value === "grid" || value === "timeline" || value === "spending" ? value : null;
}