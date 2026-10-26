import "server-only";

import type { GoogleSheetTabName } from "@/src/types";
import { createInAppsScript, deleteFromAppsScript, listFromAppsScript, updateInAppsScript } from "@/src/lib/google-apps-script/client";
import { GoogleSheetsServiceError } from "@/src/lib/google-sheets/errors";

export type GoogleSheetCell = string | number | boolean | null | undefined;
export type GoogleSheetRow = Record<string, GoogleSheetCell | unknown>;

function validateTutorId(tutorId: string) {
  if (!tutorId.trim()) throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "A tutor ID is required.", 400);
}

function deserialize(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed || !((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}")))) return value;
  try { return JSON.parse(trimmed); } catch { return value; }
}

function normalize(row: GoogleSheetRow): GoogleSheetRow {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, deserialize(value)]));
}

export async function readRows(tab: GoogleSheetTabName, tutorId: string) {
  validateTutorId(tutorId);
  const rows = await listFromAppsScript<GoogleSheetRow>(tab, tutorId);
  return rows.map(normalize).filter((row) => tab === "Tutors" ? String(row.id) === tutorId : String(row.tutorId) === tutorId);
}

export async function findRows(tab: GoogleSheetTabName, tutorId: string, criteria: Partial<GoogleSheetRow>) {
  const rows = await readRows(tab, tutorId);
  return rows.filter((row) => Object.entries(criteria).every(([key, value]) => String(row[key] ?? "") === String(value ?? "")));
}

export async function appendRows(tab: GoogleSheetTabName, tutorId: string, rows: GoogleSheetRow[]) {
  validateTutorId(tutorId);
  return Promise.all(rows.map(async (row) => normalize(await createInAppsScript<GoogleSheetRow>(tab, tutorId, { ...row, tutorId }))));
}

export async function appendRow(tab: GoogleSheetTabName, tutorId: string, row: GoogleSheetRow) {
  const [created] = await appendRows(tab, tutorId, [row]);
  if (!created) throw new GoogleSheetsServiceError("API_ERROR", "No row was created.", 502);
  return created;
}

export async function updateRow(tab: GoogleSheetTabName, tutorId: string, rowId: string, updates: GoogleSheetRow) {
  validateTutorId(tutorId);
  if (!rowId.trim()) throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "A row ID is required.", 400);
  const existing = await findRows(tab, tutorId, { id: rowId });
  if (existing.length === 0) throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "The requested row was not found.", 404);
  return normalize(await updateInAppsScript<GoogleSheetRow>(tab, tutorId, rowId, updates));
}

export async function deleteRow(tab: GoogleSheetTabName, tutorId: string, rowId: string) {
  validateTutorId(tutorId);
  await deleteFromAppsScript(tab, tutorId, rowId);
}
