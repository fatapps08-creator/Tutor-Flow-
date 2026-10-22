import "server-only";

import { google, type sheets_v4 } from "googleapis";
import { GoogleSheetsServiceError } from "@/src/lib/google-sheets/errors";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

let sheetsClient: sheets_v4.Sheets | undefined;

export function getGoogleSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID?.trim();
  const missingVariables = [
    !clientEmail && "GOOGLE_CLIENT_EMAIL",
    !privateKey && "GOOGLE_PRIVATE_KEY",
    !spreadsheetId && "GOOGLE_SHEET_ID",
  ].filter(Boolean);

  if (missingVariables.length > 0) {
    throw new GoogleSheetsServiceError(
      "CONFIGURATION",
      `Missing required server environment variables: ${missingVariables.join(", ")}.`,
      500,
    );
  }

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: [SHEETS_SCOPE],
    });
    sheetsClient = google.sheets({ version: "v4", auth });
    return sheetsClient;
  } catch {
    throw new GoogleSheetsServiceError("AUTHENTICATION");
  }
}

export function getGoogleSpreadsheetId() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID?.trim();
  if (!spreadsheetId) {
    throw new GoogleSheetsServiceError(
      "CONFIGURATION",
      "Missing required server environment variable: GOOGLE_SHEET_ID.",
      500,
    );
  }
  return spreadsheetId;
}
