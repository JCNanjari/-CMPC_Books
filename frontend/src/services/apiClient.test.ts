import { ApiError, authHeaders, request } from './apiClient';

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    blob: async () => new Blob(['csv']),
  } as Response;
}

describe('apiClient', () => {
  it('agrega el token y acepta cabeceras sueltas o Headers', () => {
    localStorage.setItem('token', 'abc');
    expect(authHeaders({ 'Content-Type': 'application/json' })).toMatchObject({
      Authorization: 'Bearer abc',
      'Content-Type': 'application/json',
    });
    expect(authHeaders(new Headers({ Accept: 'text/csv' }))).toMatchObject({
      Authorization: 'Bearer abc',
      accept: 'text/csv',
    });
    localStorage.clear();
    expect(authHeaders()).toEqual({});
  });

  it('devuelve json, blob o vacío y traduce los errores', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ data: { id: 1 } })));
    await expect(request('/books')).resolves.toEqual({ data: { id: 1 } });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(null, 204)));
    await expect(request('/nada')).resolves.toBeUndefined();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(null)));
    await expect(request<Blob>('/books/export', { asBlob: true })).resolves.toBeInstanceOf(Blob);

    const listener = vi.fn();
    window.addEventListener('auth:unauthorized', listener);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ message: ['correo inválido', 'falta clave'] }, 401)),
    );
    await expect(request('/books')).rejects.toMatchObject({ status: 401, message: 'correo inválido. falta clave' });
    expect(listener).toHaveBeenCalled();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'Credenciales inválidas' }, 401)));
    await expect(request('/auth/login', { skipAuthRedirect: true })).rejects.toBeInstanceOf(ApiError);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 500)));
    await expect(request('/books')).rejects.toThrow('Ocurrió un error inesperado');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('no json');
        },
      }),
    );
    await expect(request('/books')).rejects.toThrow('Ocurrió un error inesperado');

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(request('/books')).rejects.toThrow('No se pudo conectar con el servidor');
    window.removeEventListener('auth:unauthorized', listener);
  });
});
