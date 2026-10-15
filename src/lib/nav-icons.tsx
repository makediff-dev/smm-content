"use client";

import {
  Folders,
  Clock,
  CalendarBlank,
  TextAa,
  Cpu,
  Users,
  WarningCircle,
  Wallet,
  type Icon,
} from "@phosphor-icons/react";
import type { NavIconName } from "@/lib/navigation";

export const navIconMap: Record<NavIconName, Icon> = {
  Folders,
  Clock,
  Calendar: CalendarBlank,
  TextAa,
  Cpu,
  Users,
  Warning: WarningCircle,
  Wallet,
};
