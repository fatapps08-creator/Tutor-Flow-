import { recordApi } from "@/src/lib/persistence/record-api";
const api = recordApi("Classes");
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) { return api.update(request, (await params).id); }
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) { return api.remove((await params).id); }
