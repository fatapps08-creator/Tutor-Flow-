import "server-only";

import type { GoogleSheetTabName } from "@/src/types";
import { callGoogleAppsScript } from "@/src/lib/google-apps-script/client";
import { GoogleSheetsServiceError } from "@/src/lib/google-sheets/errors";

export type GoogleSheetCell = string | number | boolean | null | undefined;
export type GoogleSheetRow = Record<string, GoogleSheetCell>;

type AppsScriptRowsResponse = GoogleSheetRow[] | { rows?: GoogleSheetRow[]; records?: GoogleSheetRow[] };

function validateTutorId(tutorId: string) {
  if (!tutorId.trim()) {
    throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "A tutor ID is required.", 400);
  }
}

function normalizeRows(value: AppsScriptRowsResponse): GoogleSheetRow[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.rows)) return value.rows;
  if (Array.isArray(value.records)) return value.records;
  throw new GoogleSheetsServiceError("MALFORMED_RESPONSE", "Apps Script returned invalid rows.", 502);
}

function normalizeRow(value: unknown): GoogleSheetRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GoogleSheetsServiceError("MALFORMED_RESPONSE", "Apps Script returned an invalid row.", 502);
  }
  return value as GoogleSheetRow;
}

function ensureTutorMatch(row: GoogleSheetRow, tutorId: string) {
  if (row.tutorId !== undefined && String(row.tutorId) !== tutorId) {
    throw new GoogleSheetsServiceError(
      "INVALID_ARGUMENT",
      "The row tutor ID must match the requested tutor scope.",
      400,
    );
  }
}

export async function readRows(tab: GoogleSheetTabName, tutorId: string) {
  validateTutorId(tutorId);
  const response = await callGoogleAppsScript<AppsScriptRowsResponse>({
    action: "list",
    sheet: tab,
    tutorId,
  });
  return normalizeRows(response).map(normalizeRow).filter((row) => String(row.tutorId ?? "") === tutorId);
}

export async function findRows(
  tab: GoogleSheetTabName,
  tutorId: string,
  criteria: Partial<GoogleSheetRow>,
) {
  const rows = await readRows(tab, tutorId);
  const entries = Object.entries(criteria);
  if (entries.length === 0) {
    throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "At least one row match field is required.", 400);
  }
  return rows.filter((row) => entries.every(([key, value]) => String(row[key] ?? "") === String(value ?? "")));
}

export async function appendRows(tab: GoogleSheetTabName, tutorId: string, rows: GoogleSheetRow[]) {
  validateTutorId(tutorId);
  const appended: GoogleSheetRow[] = [];
  for (const row of rows) {
    ensureTutorMatch(row, tutorId);
    const record = await callGoogleAppsScript<GoogleSheetRow>({
      action: "create",
      sheet: tab,
      tutorId,
      record: { ...row, tutorId },
    });
    appended.push({ ...normalizeRow(record), tutorId });
  }
  return appended;
}

export async function appendRow(tab: GoogleSheetTabName, tutorId: string, row: GoogleSheetRow) {
  const [appended] = await appendRows(tab, tutorId, [row]);
  if (!appended) throw new GoogleSheetsServiceError("API_ERROR", "No row was created.", 502);
  return appended;
}

export async function updateRow(
  tab: GoogleSheetTabName,
  tutorId: string,
  rowId: string,
  updates: GoogleSheetRow,
) {
  validateTutorId(tutorId);
  if (!rowId.trim()) throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "A row ID is required.", 400);
  if ("id" in updates || "tutorId" in updates) {
    throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "A row update cannot change its ID or tutor ID.", 400);
  }
  const existing = await findRows(tab, tutorId, { id: rowId });
  if (existing.length === 0) {
    throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "The requested row was not found.", 404);
  }
  if (existing.length > 1) {
    throw new GoogleSheetsServiceError("MALFORMED_RESPONSE", "The requested row ID appears more than once.", 502);
  }
  const response = await callGoogleAppsScript<GoogleSheetRow>({
    action: "update",
    sheet: tab,
    tutorId,
    id: rowId,
    record: updates,
  });
  return normalizeRow(response);
}
