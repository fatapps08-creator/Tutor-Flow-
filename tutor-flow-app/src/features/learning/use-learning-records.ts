"use client";

import { useSyncExternalStore } from "react";
import {
  getLearningRecordsServerSnapshot,
  getLearningRecordsSnapshot,
  subscribeToLearningRecords,
} from "@/src/features/learning/learning-service";

export function useLearningRecords() {
  return useSyncExternalStore(
    subscribeToLearningRecords,
    getLearningRecordsSnapshot,
    getLearningRecordsServerSnapshot,
  );
}
