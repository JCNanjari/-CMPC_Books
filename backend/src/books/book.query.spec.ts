import { buildBookWhere } from './book.query';
import { presentBook } from './book.presenter';

describe('buildBookWhere', () => {
  it('excluye eliminados y aplica cada filtro', () => {
    expect(buildBookWhere({})).toEqual({ deletedAt: null });
    expect(buildBookWhere({ search: '   ' })).toEqual({ deletedAt: null });
    expect(buildBookWhere({ search: 'rayuela' }).OR).toHaveLength(3);
    expect(buildBookWhere({ authorId: 'a' })).toEqual({ deletedAt: null, authorId: 'a' });
    expect(buildBookWhere({ publisherId: 'p' })).toEqual({ deletedAt: null, publisherId: 'p' });
    expect(buildBookWhere({ genreId: 'g' })).toEqual({
      deletedAt: null,
      genres: { some: { genreId: 'g' } },
    });
    expect(buildBookWhere({ available: 'true' })).toEqual({ deletedAt: null, stock: { gt: 0 } });
    expect(buildBookWhere({ available: 'false' })).toEqual({ deletedAt: null, stock: { equals: 0 } });
  });
});

describe('presentBook', () => {
  const base = {
    id: 'b1',
    title: 'Rayuela',
    stock: 2,
    imageUrl: '/api/uploads/a.jpg',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    author: { id: 'a', name: 'Cortázar' },
    publisher: { id: 'p', name: 'Alfaguara' },
    genres: [{ genre: { id: 'g', name: 'Novela' } }],
  };

  it('convierte precio Decimal y marca disponibilidad', () => {
    const view = presentBook({ ...base, price: { toString: () => '19990.5' } } as never);
    expect(view.price).toBe(19990.5);
    expect(view.available).toBe(true);
    expect(view.genres).toEqual([{ id: 'g', name: 'Novela' }]);
    expect(view.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('acepta precio numérico y stock cero', () => {
    const view = presentBook({ ...base, price: 10, stock: 0, imageUrl: null } as never);
    expect(view.price).toBe(10);
    expect(view.available).toBe(false);
  });
});
