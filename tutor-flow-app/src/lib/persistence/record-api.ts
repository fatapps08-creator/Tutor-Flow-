import { NextResponse } from "next/server";
import { deleteRow, readRows, appendRow, updateRow, type GoogleSheetRow } from "@/src/lib/google-sheets/service";
import { GoogleSheetsServiceError, toGoogleSheetsErrorResponse } from "@/src/lib/google-sheets/errors";
import { getCoreApiTutorId, getStudentsTutorId } from "@/src/features/students/development-tutor";
import type { GoogleSheetTabName } from "@/src/types";

function withoutOwnershipFields(value: unknown): GoogleSheetRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "The request body must be an object.", 400);
  }

  const row = { ...(value as GoogleSheetRow) };
  delete row.centerId;
  delete row.tutorId;
  return row;
}

export function recordApi(sheet: GoogleSheetTabName, tenantScoped = false) {
  const getTutorId = tenantScoped ? getCoreApiTutorId : getStudentsTutorId;

  return {
    async list() {
      try { return NextResponse.json({ data: await readRows(sheet, await getTutorId()) }); }
      catch (error) { return toGoogleSheetsErrorResponse(error); }
    },
    async create(request: Request) {
      try {
        const body = withoutOwnershipFields(await request.json());
        return NextResponse.json({ data: await appendRow(sheet, await getTutorId(), body) }, { status: 201 });
      } catch (error) { return toGoogleSheetsErrorResponse(error); }
    },
    async update(request: Request, id: string) {
      try {
        const body = withoutOwnershipFields(await request.json());
        return NextResponse.json({ data: await updateRow(sheet, await getTutorId(), id, body) });
      } catch (error) { return toGoogleSheetsErrorResponse(error); }
    },
    async remove(id: string) {
      try { await deleteRow(sheet, await getTutorId(), id); return NextResponse.json({ success: true }); }
      catch (error) { return toGoogleSheetsErrorResponse(error); }
    },
  };
}
