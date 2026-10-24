import { NextResponse } from "next/server";
import { callGoogleAppsScript } from "@/src/lib/google-apps-script/client";
import { toGoogleSheetsErrorResponse } from "@/src/lib/google-sheets/errors";

export async function GET() {
  try {
    const response = await callGoogleAppsScript();
    const isHealthy = response.success === true
      && response.message === "Tutor Flow API is running";

    if (!isHealthy) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MALFORMED_RESPONSE",
            message: "The Google Apps Script health response did not pass validation.",
          },
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      message: response.message,
      spreadsheetName: typeof response.spreadsheetName === "string"
        ? response.spreadsheetName
        : undefined,
      sheetNames: Array.isArray(response.sheetNames)
        && response.sheetNames.every((name) => typeof name === "string")
        ? response.sheetNames
        : undefined,
    });
  } catch (error) {
    return toGoogleSheetsErrorResponse(error);
  }
}
