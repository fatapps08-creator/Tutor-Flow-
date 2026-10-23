import "server-only";

import { GoogleSheetsServiceError } from "@/src/lib/google-sheets/errors";

export type AppsScriptRequest = {
  operation: string;
  tutorId: string;
  payload?: unknown;
};

type AppsScriptErrorPayload = {
  error?: {
    code?: unknown;
    message?: unknown;
  };
};

const statusToErrorCode = (status: number) => {
  if (status === 400) return "INVALID_ARGUMENT" as const;
  if (status === 401 || status === 403) return "UNAUTHORIZED" as const;
  if (status === 404) return "WORKSHEET_NOT_FOUND" as const;
  if (status === 409) return "CONFLICT" as const;
  return "API_ERROR" as const;
};

function getApiUrl() {
  const url = process.env.TUTOR_FLOW_API_URL?.trim();
  if (!url) {
    throw new GoogleSheetsServiceError(
      "CONFIGURATION",
      "The Tutor Flow Apps Script API URL is not configured on the server.",
      500,
    );
  }
  try {
    return new URL(url).toString();
  } catch {
    throw new GoogleSheetsServiceError(
      "CONFIGURATION",
      "The Tutor Flow Apps Script API URL is invalid.",
      500,
    );
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new GoogleSheetsServiceError("API_ERROR", "The Apps Script API returned invalid JSON.", 502);
  }
}

export async function appsScriptRequest<T>(request: AppsScriptRequest): Promise<T> {
  if (!request.tutorId.trim()) {
    throw new GoogleSheetsServiceError("UNAUTHORIZED", "A tutor identity is required.", 401);
  }

  const url = getApiUrl();
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      cache: "no-store",
    });
  } catch {
    throw new GoogleSheetsServiceError("API_ERROR", "The Apps Script API could not be reached.", 502);
  }

  const body = await readJson(response);
  if (!response.ok) {
    const error = body as AppsScriptErrorPayload;
    const message = typeof error.error?.message === "string"
      ? error.error.message
      : undefined;
    throw new GoogleSheetsServiceError(
      statusToErrorCode(response.status),
      message ?? undefined,
      response.status >= 500 ? 502 : response.status,
    );
  }

  return body as T;
}
