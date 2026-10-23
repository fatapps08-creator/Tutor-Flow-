import "server-only";

import type { GoogleSheetTabName } from "@/src/types";
import { getGoogleSheetsClient, getGoogleSpreadsheetId } from "@/src/lib/google-sheets/client";
import { GoogleSheetsServiceError, toSafeGoogleSheetsError } from "@/src/lib/google-sheets/errors";
import { STUDENTS_SHEET_HEADERS, validateSheetHeaders } from "@/src/lib/google-sheets/schema";

export type GoogleSheetCell = string | number | boolean | null | undefined;
export type GoogleSheetRow = Record<string, GoogleSheetCell>;
type SheetHeaders = {
  values: string[];
  rowIndexes: Map<string, number>;
};

const ROWS_RANGE = "A:ZZZ";

function validateTutorId(tutorId: string) {
  if (!tutorId.trim()) {
    throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "A tutor ID is required.", 400);
  }
}

function quotedTabRange(tab: GoogleSheetTabName, range: string) {
  return `'${tab.replace(/'/g, "''")}'!${range}`;
}

function columnLabel(index: number) {
  let result = "";
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function rowToObject(headers: string[], values: unknown[]): GoogleSheetRow {
  return Object.fromEntries(headers.map((header, index) => [
    header,
    normalizeCell(values[index]),
  ]));
}

function normalizeCell(value: unknown): GoogleSheetCell {
  if (value === undefined || value === null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  throw new GoogleSheetsServiceError("MALFORMED_RESPONSE");
}

function validateRowValues(headers: SheetHeaders, row: GoogleSheetRow) {
  const unknownFields = Object.keys(row).filter((field) => !headers.rowIndexes.has(field));
  if (unknownFields.length > 0) {
    throw new GoogleSheetsServiceError(
      "INVALID_ARGUMENT",
      `The worksheet is missing columns: ${unknownFields.join(", ")}.`,
      400,
    );
  }
}

async function getSheetMetadata(tab: GoogleSheetTabName) {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = getGoogleSpreadsheetId();
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties(sheetId,title)",
    });
    const metadata = response.data.sheets;
    if (!Array.isArray(metadata)) {
      throw new GoogleSheetsServiceError("MALFORMED_RESPONSE");
    }
    const sheet = metadata.find((item) => item.properties?.title === tab);
    if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) {
      throw new GoogleSheetsServiceError(
        "WORKSHEET_NOT_FOUND",
        `Worksheet "${tab}" is missing from the configured spreadsheet.`,
        404,
      );
    }
    return { sheets, spreadsheetId, sheetId: sheet.properties.sheetId };
  } catch (error) {
    if (error instanceof GoogleSheetsServiceError) throw error;
    const safeError = toSafeGoogleSheetsError(error);
    throw new GoogleSheetsServiceError(safeError.code, safeError.message, safeError.status);
  }
}

async function getHeaders(tab: GoogleSheetTabName): Promise<SheetHeaders> {
  const { sheets, spreadsheetId } = await getSheetMetadata(tab);
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: quotedTabRange(tab, "1:1"),
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    const values = response.data.values?.[0];
    if (!Array.isArray(values) || values.length === 0) {
      throw new GoogleSheetsServiceError(
        "MALFORMED_RESPONSE",
        `Worksheet "${tab}" does not have a header row.`,
      );
    }
    const headers = values.map((value) => {
      if (typeof value !== "string" || !value.trim()) {
        throw new GoogleSheetsServiceError("MALFORMED_RESPONSE");
      }
      return value.trim();
    });
    if (tab === "Students") validateSheetHeaders(headers, STUDENTS_SHEET_HEADERS);
    if (new Set(headers).size !== headers.length || !headers.includes("tutorId")) {
      throw new GoogleSheetsServiceError(
        "MALFORMED_RESPONSE",
        `Worksheet "${tab}" must have unique column headers, including tutorId.`,
      );
    }
    return {
      values: headers,
      rowIndexes: new Map(headers.map((header, index) => [header, index])),
    };
  } catch (error) {
    if (error instanceof GoogleSheetsServiceError) throw error;
    const safeError = toSafeGoogleSheetsError(error);
    throw new GoogleSheetsServiceError(safeError.code, safeError.message, safeError.status);
  }
}

async function getRawRows(tab: GoogleSheetTabName, headers: SheetHeaders) {
  const { sheets, spreadsheetId } = await getSheetMetadata(tab);
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: quotedTabRange(tab, ROWS_RANGE),
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    const rows = response.data.values ?? [];
    if (!Array.isArray(rows) || rows.some((row) => !Array.isArray(row))) {
      throw new GoogleSheetsServiceError("MALFORMED_RESPONSE");
    }
    return {
      rows: rows.slice(1).map((values, index) => ({
        sheetRowNumber: index + 2,
        values,
        row: rowToObject(headers.values, values),
      })),
      sheets,
      spreadsheetId,
    };
  } catch (error) {
    if (error instanceof GoogleSheetsServiceError) throw error;
    const safeError = toSafeGoogleSheetsError(error);
    throw new GoogleSheetsServiceError(safeError.code, safeError.message, safeError.status);
  }
}

function ensureTutorMatch(row: GoogleSheetRow, tutorId: string) {
  if (String(row.tutorId ?? "") !== tutorId) {
    throw new GoogleSheetsServiceError(
      "INVALID_ARGUMENT",
      "The row tutor ID must match the requested tutor scope.",
      400,
    );
  }
}

export async function readRows(tab: GoogleSheetTabName, tutorId: string) {
  validateTutorId(tutorId);
  const headers = await getHeaders(tab);
  if (!headers.rowIndexes.has("tutorId")) {
    throw new GoogleSheetsServiceError("MALFORMED_RESPONSE");
  }
  const { rows } = await getRawRows(tab, headers);
  return rows
    .map(({ row }) => row)
    .filter((row) => String(row.tutorId ?? "") === tutorId);
}

export async function findRows(
  tab: GoogleSheetTabName,
  tutorId: string,
  criteria: Partial<GoogleSheetRow>,
) {
  const rows = await readRows(tab, tutorId);
  const entries = Object.entries(criteria);
  if (entries.length === 0) {
    throw new GoogleSheetsServiceError(
      "INVALID_ARGUMENT",
      "At least one row match field is required.",
      400,
    );
  }
  return rows.filter((row) => entries.every(([key, value]) => (
    String(row[key] ?? "") === String(value ?? "")
  )));
}

export async function appendRows(
  tab: GoogleSheetTabName,
  tutorId: string,
  rows: GoogleSheetRow[],
) {
  validateTutorId(tutorId);
  if (rows.length === 0) return [];
  const headers = await getHeaders(tab);
  const normalizedRows = rows.map((row) => {
    if (row.tutorId !== undefined) ensureTutorMatch(row, tutorId);
    const normalized: GoogleSheetRow = { ...row, tutorId };
    validateRowValues(headers, normalized);
    return headers.values.map((header) => normalizeCell(normalized[header]));
  });
  const { sheets, spreadsheetId } = await getSheetMetadata(tab);

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: quotedTabRange(tab, ROWS_RANGE),
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: normalizedRows },
    });
    if (!response.data.updates?.updatedRange) {
      throw new GoogleSheetsServiceError("MALFORMED_RESPONSE");
    }
    return rows.map((row) => ({ ...row, tutorId }));
  } catch (error) {
    if (error instanceof GoogleSheetsServiceError) throw error;
    const safeError = toSafeGoogleSheetsError(error);
    throw new GoogleSheetsServiceError(safeError.code, safeError.message, safeError.status);
  }
}

export async function appendRow(tab: GoogleSheetTabName, tutorId: string, row: GoogleSheetRow) {
  const [appended] = await appendRows(tab, tutorId, [row]);
  if (!appended) {
    throw new GoogleSheetsServiceError("API_ERROR", "No row was appended.", 502);
  }
  return appended;
}

export async function updateRow(
  tab: GoogleSheetTabName,
  tutorId: string,
  rowId: string,
  updates: GoogleSheetRow,
) {
  validateTutorId(tutorId);
  if (!rowId.trim()) {
    throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "A row ID is required.", 400);
  }
  if ("id" in updates || "tutorId" in updates) {
    throw new GoogleSheetsServiceError(
      "INVALID_ARGUMENT",
      "A row update cannot change its ID or tutor ID.",
      400,
    );
  }
  const headers = await getHeaders(tab);
  if (!headers.rowIndexes.has("id")) {
    throw new GoogleSheetsServiceError(
      "MALFORMED_RESPONSE",
      `Worksheet "${tab}" must have an id column to update rows.`,
    );
  }
  validateRowValues(headers, updates);
  const { rows, sheets, spreadsheetId } = await getRawRows(tab, headers);
  const target = rows.find(({ row }) => (
    String(row.tutorId ?? "") === tutorId && String(row.id ?? "") === rowId
  ));
  if (!target) {
    throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "The requested row was not found.", 404);
  }

  const nextRow = { ...target.row, ...updates };
  const startColumn = columnLabel(0);
  const endColumn = columnLabel(headers.values.length - 1);
  const range = quotedTabRange(
    tab,
    `${startColumn}${target.sheetRowNumber}:${endColumn}${target.sheetRowNumber}`,
  );

  try {
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values: [headers.values.map((header) => normalizeCell(nextRow[header]))] },
    });
    if (!response.data.updatedRange) {
      throw new GoogleSheetsServiceError("MALFORMED_RESPONSE");
    }
    return nextRow;
  } catch (error) {
    if (error instanceof GoogleSheetsServiceError) throw error;
    const safeError = toSafeGoogleSheetsError(error);
    throw new GoogleSheetsServiceError(safeError.code, safeError.message, safeError.status);
  }
}
