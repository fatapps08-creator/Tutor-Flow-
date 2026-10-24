import { NextResponse } from "next/server";
import { requireCurrentTutor } from "@/src/lib/identity/server";
import { getClassesForTutor, createClassForTutor } from "@/src/features/classes/class-repository";
import { toGoogleSheetsErrorResponse } from "@/src/lib/google-sheets/errors";

export async function GET() { try { const tutor = await requireCurrentTutor(); return NextResponse.json({ classes: await getClassesForTutor(tutor.tutorId) }); } catch (error) { return toGoogleSheetsErrorResponse(error); } }
export async function POST(request: Request) { try { const tutor = await requireCurrentTutor(); const input = await request.json(); return NextResponse.json({ class: await createClassForTutor(tutor.tutorId, input) }, { status: 201 }); } catch (error) { return toGoogleSheetsErrorResponse(error); } }
