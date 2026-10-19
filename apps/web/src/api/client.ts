// A failed API call. `status` is the HTTP status, or 0 when the server
// couldn't be reached at all.
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Nest error bodies look like { statusCode, message } where message is a
// string, or a list of strings for validation errors.
function messageFrom(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const { message } = body as { message: unknown };
    if (Array.isArray(message)) {
      return message.join('. ');
    }
    if (typeof message === 'string') {
      return message;
    }
  }
  return fallback;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
};

// Every request goes through here. The API is on the same origin (Vite proxies
// /api in dev; Nest serves both in prod), so the browser sends the auth cookie
// automatically and no token handling is needed in JavaScript.
export async function apiFetch<T>(
  path: string,
  { method = 'GET', body }: RequestOptions = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection.');
  }

  // 204 No Content (e.g. logout) has no body to parse.
  if (res.status === 204) {
    return undefined as T;
  }

  const data: unknown = await res.json().catch(() => null);
  // 5xx means a server-side problem (or, in dev, the API not running behind
  // the proxy). Its details mean nothing to the user, so say it plainly.
  if (res.status >= 500) {
    throw new ApiError(
      res.status,
      'Something went wrong on our end. Please try again.',
    );
  }
  if (!res.ok) {
    throw new ApiError(
      res.status,
      messageFrom(data, `Request failed (${res.status})`),
    );
  }
  return data as T;
}
