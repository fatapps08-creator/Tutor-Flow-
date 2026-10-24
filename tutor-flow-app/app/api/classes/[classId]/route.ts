import { NextResponse } from "next/server";
import { requireCurrentTutor } from "@/src/lib/identity/server";
import { updateClassForTutor, updateClassStatusForTutor } from "@/src/features/classes/class-repository";
import { toGoogleSheetsErrorResponse } from "@/src/lib/google-sheets/errors";

export async function PATCH(request: Request, { params }: { params: Promise<{ classId: string }> }) { try { const tutor = await requireCurrentTutor(); const { classId } = await params; const input = await request.json(); const result = input.status ? await updateClassStatusForTutor(tutor.tutorId, classId, input.status) : await updateClassForTutor(tutor.tutorId, classId, input); return NextResponse.json({ class: result }); } catch (error) { return toGoogleSheetsErrorResponse(error); } }
