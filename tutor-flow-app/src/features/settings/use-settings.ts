"use client";

import { useSyncExternalStore } from "react";
import {
  getSettingsServerSnapshot,
  getSettingsSnapshot,
  subscribeToSettings,
} from "@/src/features/settings/settings-service";

export function useSettings() {
  return useSyncExternalStore(
    subscribeToSettings,
    getSettingsSnapshot,
    getSettingsServerSnapshot,
  );
}
