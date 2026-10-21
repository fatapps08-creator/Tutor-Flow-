"use client";

import { useSyncExternalStore } from "react";
import {
  getAttendanceServerSnapshot,
  getAttendanceSnapshot,
  subscribeToAttendance,
} from "@/src/features/attendance/attendance-service";

export function useAttendance() {
  return useSyncExternalStore(
    subscribeToAttendance,
    getAttendanceSnapshot,
    getAttendanceServerSnapshot,
  );
}
