export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_URL = import.meta.env.VITE_API_URL || '/api';

export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

export function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    ...(extra instanceof Headers ? Object.fromEntries(extra.entries()) : extra),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

interface RequestOptions extends RequestInit {
  skipAuthRedirect?: boolean;
  asBlob?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuthRedirect, asBlob, headers, ...rest } = options;
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...rest,
      headers: authHeaders(headers),
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor');
  }

  if (!response.ok) {
    let message = 'Ocurrió un error inesperado';
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join('. ');
      else if (body.message) message = body.message;
    } catch {
      message = 'Ocurrió un error inesperado';
    }
    if (response.status === 401 && !skipAuthRedirect) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    throw new ApiError(response.status, message);
  }

  if (asBlob) return (await response.blob()) as T;
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
