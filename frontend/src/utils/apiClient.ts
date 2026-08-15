/**
 * Shared backend API client helper.
 *
 * Automatically injects the `X-API-Key` header when `VITE_API_SECRET_KEY`
 * is configured in the frontend environment. When the variable is absent
 * (default local-dev mode) the header is simply omitted.
 */

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

function getAuthHeaders(): HeadersInit {
  const key = import.meta.env.VITE_API_SECRET_KEY as string | undefined;
  if (key) {
    return { 'X-API-Key': key };
  }
  return {};
}

export function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers({
    ...getAuthHeaders(),
    ...(init.headers as Record<string, string> | undefined),
  });

  return fetch(`${BACKEND_URL}${path}`, { ...init, headers });
}
