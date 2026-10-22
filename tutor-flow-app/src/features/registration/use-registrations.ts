"use client";

import { useSyncExternalStore } from "react";
import {
  getRegistrationsServerSnapshot,
  getRegistrationsSnapshot,
  subscribeToRegistrations,
} from "@/src/features/registration/registration-service";

export function useRegistrations() {
  return useSyncExternalStore(
    subscribeToRegistrations,
    getRegistrationsSnapshot,
    getRegistrationsServerSnapshot,
  );
}
