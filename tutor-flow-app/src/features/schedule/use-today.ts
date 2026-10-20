"use client";

import { useSyncExternalStore } from "react";
import { initialScheduleSessions } from "@/src/features/schedule/mock-data";

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getTodaySnapshot() {
  return dateKey(new Date());
}

function getCurrentMinuteSnapshot() {
  const date = new Date();
  return date.getHours() * 60 + date.getMinutes();
}

function getServerSnapshot() {
  return initialScheduleSessions[0]?.date ?? "2026-10-20";
}

function subscribeToToday(onChange: () => void) {
  const interval = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(interval);
}

export function useTodayDate() {
  return useSyncExternalStore(subscribeToToday, getTodaySnapshot, getServerSnapshot);
}

export function useCurrentMinute() {
  return useSyncExternalStore(subscribeToToday, getCurrentMinuteSnapshot, () => 0);
}
