import { NextResponse } from "next/server";
import { deleteRow, readRows, appendRow, updateRow, type GoogleSheetRow } from "@/src/lib/google-sheets/service";
import { toGoogleSheetsErrorResponse } from "@/src/lib/google-sheets/errors";
import { getStudentsTutorId } from "@/src/features/students/development-tutor";
import type { GoogleSheetTabName } from "@/src/types";

export function recordApi(sheet: GoogleSheetTabName) {
  return {
    async list() {
      try { return NextResponse.json({ data: await readRows(sheet, getStudentsTutorId()) }); }
      catch (error) { return toGoogleSheetsErrorResponse(error); }
    },
    async create(request: Request) {
      try {
        const body = await request.json() as GoogleSheetRow;
        return NextResponse.json({ data: await appendRow(sheet, getStudentsTutorId(), body) }, { status: 201 });
      } catch (error) { return toGoogleSheetsErrorResponse(error); }
    },
    async update(request: Request, id: string) {
      try {
        const body = await request.json() as GoogleSheetRow;
        return NextResponse.json({ data: await updateRow(sheet, getStudentsTutorId(), id, body) });
      } catch (error) { return toGoogleSheetsErrorResponse(error); }
    },
    async remove(id: string) {
      try { await deleteRow(sheet, getStudentsTutorId(), id); return NextResponse.json({ success: true }); }
      catch (error) { return toGoogleSheetsErrorResponse(error); }
    },
  };
}
