import { NextResponse } from "next/server";
import {
  GoogleSheetsServiceError,
  toGoogleSheetsErrorResponse,
} from "@/src/lib/google-sheets/errors";
import { getCoreApiTutorId } from "@/src/features/students/development-tutor";
import { isDevelopmentAuthBypassEnabled } from "@/src/features/auth/config";
import { requireRole } from "@/src/features/authorization/role-authorization";
import {
  deleteStudentForTutor,
  getStudentForTutor,
  updateStudentForTutor,
  updateStudentStatusForTutor,
} from "@/src/features/students/student-repository";
import {
  parseStudentInput,
  readStudentRequestBody,
} from "@/src/features/students/student-api-validation";
import type { StudentStatus } from "@/src/types";

type StudentRouteContext = {
  params: Promise<{ studentId: string }>;
};

export async function GET(_request: Request, { params }: StudentRouteContext) {
  try {
    if (!isDevelopmentAuthBypassEnabled()) {
      await requireRole("OWNER", "ADMIN", "TUTOR", "STAFF");
    }
    const { studentId } = await params;
    const student = await getStudentForTutor(await getCoreApiTutorId(), studentId);
    if (!student) {
      throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "The student was not found.", 404);
    }
    return NextResponse.json({ student });
  } catch (error) {
    logStudentApiError("get", error);
    return toGoogleSheetsErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: StudentRouteContext) {
  try {
    if (!isDevelopmentAuthBypassEnabled()) {
      await requireRole("OWNER", "ADMIN", "TUTOR", "STAFF");
    }
    const { studentId } = await params;
    await deleteStudentForTutor(await getCoreApiTutorId(), studentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    logStudentApiError("delete", error);
    return toGoogleSheetsErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: StudentRouteContext) {
  try {
    if (!isDevelopmentAuthBypassEnabled()) {
      await requireRole("OWNER", "ADMIN", "TUTOR", "STAFF");
    }
    const { studentId } = await params;
    const payload: unknown = await readStudentRequestBody(request);
    const tutorId = await getCoreApiTutorId();
    if (
      payload
      && typeof payload === "object"
      && "status" in payload
      && Object.keys(payload).length === 1
    ) {
      const status = (payload as { status?: unknown }).status;
      if (status !== "active" && status !== "inactive" && status !== "paused") {
        throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "Choose a valid student status.", 400);
      }
      const student = await updateStudentStatusForTutor(tutorId, studentId, status as StudentStatus);
      return NextResponse.json({ student });
    }

    const student = await updateStudentForTutor(tutorId, studentId, parseStudentInput(payload));
    return NextResponse.json({ student });
  } catch (error) {
    logStudentApiError("update", error);
    return toGoogleSheetsErrorResponse(error);
  }
}

function logStudentApiError(operation: string, error: unknown) {
  const code = error instanceof GoogleSheetsServiceError ? error.code : "UNEXPECTED";
  console.error(`[students-api] ${operation} failed`, { code });
}
