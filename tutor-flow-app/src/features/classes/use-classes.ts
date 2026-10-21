"use client";

import { useSyncExternalStore } from "react";
import {
  getClassesServerSnapshot,
  getClassesSnapshot,
  subscribeToClasses,
} from "@/src/features/classes/class-service";

export function useClasses() {
  return useSyncExternalStore(
    subscribeToClasses,
    getClassesSnapshot,
    getClassesServerSnapshot,
  );
}
