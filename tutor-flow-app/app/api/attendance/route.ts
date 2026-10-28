import { recordApi } from "@/src/lib/persistence/record-api";
const api = recordApi("Attendance", true);
export const GET = () => api.list();
export const POST = (request: Request) => api.create(request);
