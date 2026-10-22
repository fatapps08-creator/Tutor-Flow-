import type { Settings } from "@/src/types";

export type SettingsInput = Omit<Settings, "id" | "tutorId">;

export const initialSettings: Settings = {
  id: "settings-tutor-demo",
  tutorId: "tutor-demo",
  tutorDisplayName: "Sarah",
  businessName: "Tutor Flow",
  currency: "MYR",
  timezone: "Asia/Kuala_Lumpur",
  language: "en",
  defaultSessionDurationMinutes: 60,
};

let settings = initialSettings;
let snapshot = settings;
const serverSnapshot = initialSettings;
const listeners = new Set<() => void>();

function notify() {
  snapshot = settings;
  listeners.forEach((listener) => listener());
}

export function subscribeToSettings(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSettingsSnapshot() {
  return snapshot;
}

export function getSettingsServerSnapshot() {
  return serverSnapshot;
}

export function getSettings() {
  return settings;
}

export function updateSettings(input: SettingsInput) {
  if (!input.tutorDisplayName.trim()) {
    throw new Error("A tutor display name is required.");
  }
  if (!input.businessName.trim()) {
    throw new Error("A business name is required.");
  }
  if (!/^[A-Z]{3}$/.test(input.currency)) {
    throw new Error("Choose a valid currency.");
  }
  if (!input.timezone.trim()) {
    throw new Error("Choose a timezone.");
  }
  if (input.language !== "en" && input.language !== "ms") {
    throw new Error("Choose a supported language.");
  }
  if (
    !Number.isInteger(input.defaultSessionDurationMinutes)
    || input.defaultSessionDurationMinutes < 1
    || input.defaultSessionDurationMinutes > 720
  ) {
    throw new Error("Session duration must be between 1 and 720 minutes.");
  }

  settings = {
    ...input,
    id: settings.id,
    tutorId: settings.tutorId,
    tutorDisplayName: input.tutorDisplayName.trim(),
    businessName: input.businessName.trim(),
    timezone: input.timezone.trim(),
  };
  notify();
  return settings;
}
