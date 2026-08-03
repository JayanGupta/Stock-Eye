const ML_API_URL = process.env.ML_API_URL ?? "http://localhost:8000";

export class MLServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MLServiceError";
  }
}

/** Fetch helper for the Python ML service. */
export async function mlFetch(
  path: string,
  init?: RequestInit,
): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(`${ML_API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
  } catch {
    throw new MLServiceError(
      "ML service is offline. Start it with `pnpm ml:dev`.",
    );
  }

  if (!res.ok) {
    throw new MLServiceError(`ML service error (${res.status})`);
  }

  const json = await res.json();
  if (typeof json !== "object" || json === null) {
    throw new MLServiceError("ML service returned an invalid payload");
  }
  return json as Record<string, unknown>;
}
