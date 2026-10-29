import { NextResponse } from "next/server";
import { deleteRow, readRows, appendRow, updateRow, type GoogleSheetRow } from "@/src/lib/google-sheets/service";
import { GoogleSheetsServiceError, toGoogleSheetsErrorResponse } from "@/src/lib/google-sheets/errors";
import { getCoreApiTutorId, getStudentsTutorId } from "@/src/features/students/development-tutor";
import { isDevelopmentAuthBypassEnabled } from "@/src/features/auth/config";
import { requireRole } from "@/src/features/authorization/role-authorization";
import type { GoogleSheetTabName } from "@/src/types";

const tenantRoles = ["OWNER", "ADMIN", "TUTOR", "STAFF"] as const;

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
  const getAuthorizedTutorId = async () => {
    if (tenantScoped && !isDevelopmentAuthBypassEnabled()) {
      await requireRole(...tenantRoles);
    }
    return getTutorId();
  };

  return {
    async list() {
      try { return NextResponse.json({ data: await readRows(sheet, await getAuthorizedTutorId()) }); }
      catch (error) { return toGoogleSheetsErrorResponse(error); }
    },
    async create(request: Request) {
      try {
        const tutorId = await getAuthorizedTutorId();
        const body = withoutOwnershipFields(await request.json());
        return NextResponse.json({ data: await appendRow(sheet, tutorId, body) }, { status: 201 });
      } catch (error) { return toGoogleSheetsErrorResponse(error); }
    },
    async update(request: Request, id: string) {
      try {
        const tutorId = await getAuthorizedTutorId();
        const body = withoutOwnershipFields(await request.json());
        return NextResponse.json({ data: await updateRow(sheet, tutorId, id, body) });
      } catch (error) { return toGoogleSheetsErrorResponse(error); }
    },
    async remove(id: string) {
      try { await deleteRow(sheet, await getAuthorizedTutorId(), id); return NextResponse.json({ success: true }); }
      catch (error) { return toGoogleSheetsErrorResponse(error); }
    },
  };
}
