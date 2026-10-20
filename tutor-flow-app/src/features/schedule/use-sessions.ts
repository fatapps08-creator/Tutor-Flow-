"use client";

import { useSyncExternalStore } from "react";
import {
  getSessionsServerSnapshot,
  getSessionsSnapshot,
  subscribeToSessions,
} from "@/src/features/schedule/schedule-service";

export function useSessions() {
  return useSyncExternalStore(
    subscribeToSessions,
    getSessionsSnapshot,
    getSessionsServerSnapshot,
  );
}
