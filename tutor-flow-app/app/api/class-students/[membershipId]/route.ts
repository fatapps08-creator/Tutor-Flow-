import { NextResponse } from "next/server";
import { requireCurrentTutor } from "@/src/lib/identity/server";
import { updateClassStudentStatusForTutor } from "@/src/features/classes/class-repository";
import { toGoogleSheetsErrorResponse } from "@/src/lib/google-sheets/errors";

export async function PATCH(request: Request, { params }: { params: Promise<{ membershipId: string }> }) { try { const tutor = await requireCurrentTutor(); const { membershipId } = await params; const { status } = await request.json(); return NextResponse.json({ classStudent: await updateClassStudentStatusForTutor(tutor.tutorId, membershipId, status) }); } catch (error) { return toGoogleSheetsErrorResponse(error); } }
