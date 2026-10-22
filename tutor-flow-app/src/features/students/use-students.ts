"use client";

import { useSyncExternalStore } from "react";
import { useEffect } from "react";
import {
  getStudentsLoadStateSnapshot,
  getStudentsServerLoadStateSnapshot,
  getStudentsServerSnapshot,
  getStudentsSnapshot,
  loadStudentsFromApi,
  subscribeToStudents,
} from "@/src/features/students/student-service";

export function useStudents() {
  const students = useSyncExternalStore(
    subscribeToStudents,
    getStudentsSnapshot,
    getStudentsServerSnapshot,
  );

  useEffect(() => {
    void loadStudentsFromApi();
  }, []);

  return students;
}

export function useStudentsLoadState() {
  return useSyncExternalStore(
    subscribeToStudents,
    getStudentsLoadStateSnapshot,
    getStudentsServerLoadStateSnapshot,
  );
}
