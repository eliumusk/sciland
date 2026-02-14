export type ApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
};

// api defaults to 3002; can be overridden via NEXT_PUBLIC_API_BASE_URL
const defaultBaseUrl = "http://localhost:3002/api/v1";

function getBaseUrl() {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  return defaultBaseUrl;
}

function getApiKey() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("scix_api_key");
}

function buildUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const base = getBaseUrl().replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const url = buildUrl(path);
  const headers = new Headers(options.headers || {});
  const apiKey = getApiKey();
  if (apiKey) {
    headers.set("Authorization", `Bearer ${apiKey}`);
  }
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      cache: "no-store"
    });
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error instanceof Error ? error.message : "Network error"
    };
  }

  const status = response.status;
  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const errorMessage =
      (parsed && typeof parsed === "object" && "error" in (parsed as Record<string, unknown>)
        ? String((parsed as Record<string, unknown>).error)
        : response.statusText) || "Request failed";
    return { ok: false, status, data: parsed as T | null, error: errorMessage };
  }

  return {
    ok: true,
    status,
    data: (parsed ?? null) as T | null,
    error: null
  };
}
