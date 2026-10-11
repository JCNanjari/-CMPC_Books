import { downloadBooksExcel, createBook, getBook, listBooks, removeBook, updateBook } from './bookService';
import { loginRequest } from './authService';
import { listAuthors, listGenres, listPublishers } from './catalogService';
import { listAudit } from './auditService';

const book = {
  id: '1',
  title: 'Rayuela',
  price: 10,
  stock: 1,
  available: true,
  imageUrl: null,
  author: { id: 'a', name: 'Cortázar' },
  publisher: { id: 'p', name: 'Alfaguara' },
  genres: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const meta = { page: 1, limit: 10, total: 1, totalPages: 1 };
const entry = {
  id: 'l',
  action: 'LOGIN',
  entity: 'User',
  entityId: null,
  ip: null,
  metadata: null,
  createdAt: book.createdAt,
  user: null,
};

function payload(url: string, method: string) {
  if (url.includes('/audit')) return { data: [entry], meta };
  if (url.includes('/authors') || url.includes('/publishers') || url.includes('/genres')) {
    return { data: [{ id: 'a', name: 'Ana' }] };
  }
  if (url.includes('/auth')) {
    return { data: { accessToken: 't', expiresIn: '8h', user: { id: 'u', email: 'a@b.c', name: 'Ana' } } };
  }
  if (method === 'GET' && url.includes('/books?')) return { data: [book], meta };
  if (method === 'DELETE') return { data: { id: '1', deleted: true } };
  return { data: book };
}

describe('servicios', () => {
  it('habla con la API de libros, catálogo, sesión y auditoría', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        if (String(url).includes('/export')) {
          return { ok: true, status: 200, blob: async () => new Blob(['xlsx']), json: async () => ({}) };
        }
        return {
          ok: true,
          status: 200,
          json: async () => payload(String(url), init?.method ?? 'GET'),
          blob: async () => new Blob(['xlsx']),
        };
      }),
    );
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:1');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    expect((await listBooks({ page: 1, limit: 10 })).data[0].title).toBe('Rayuela');
    expect((await getBook('1')).title).toBe('Rayuela');
    expect((await createBook(new FormData())).title).toBe('Rayuela');
    expect((await updateBook('1', new FormData())).title).toBe('Rayuela');
    expect(await removeBook('1')).toEqual({ id: '1', deleted: true });
    await downloadBooksExcel({ search: 'ray' });
    expect((await loginRequest('a@b.c', 'Admin123!')).accessToken).toBe('t');
    expect((await listAuthors())[0].name).toBe('Ana');
    expect((await listPublishers())[0].name).toBe('Ana');
    expect((await listGenres())[0].name).toBe('Ana');
    expect((await listAudit()).data[0].action).toBe('LOGIN');
  });
});
