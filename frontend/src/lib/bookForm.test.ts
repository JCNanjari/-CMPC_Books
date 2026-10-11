import { bookSchema, bookToForm, addGenreName, loginSchema, toBookPayload, toFormData, toggleId } from './bookForm';
import { Book } from '../types';

const valid = {
  title: 'Rayuela',
  authorMode: 'existing' as const,
  authorId: 'a1',
  authorName: '',
  publisherMode: 'existing' as const,
  publisherId: 'p1',
  publisherName: '',
  genreIds: ['g1'],
  genreNames: [],
  price: 1000,
  stock: 2,
};

describe('formulario de libro', () => {
  it('acepta un alta completa y rechaza los huecos', () => {
    expect(bookSchema.safeParse(valid).success).toBe(true);
    expect(bookSchema.safeParse({ ...valid, title: '' }).success).toBe(false);
    expect(bookSchema.safeParse({ ...valid, title: 'a'.repeat(201) }).success).toBe(false);
    expect(bookSchema.safeParse({ ...valid, authorId: '' }).success).toBe(false);
    expect(bookSchema.safeParse({ ...valid, authorMode: 'new', authorName: '' }).success).toBe(false);
    expect(bookSchema.safeParse({ ...valid, authorMode: 'new', authorName: 'a'.repeat(121) }).success).toBe(false);
    expect(bookSchema.safeParse({ ...valid, publisherId: '' }).success).toBe(false);
    expect(bookSchema.safeParse({ ...valid, publisherMode: 'new', publisherName: '' }).success).toBe(false);
    expect(bookSchema.safeParse({ ...valid, publisherMode: 'new', publisherName: 'e'.repeat(121) }).success).toBe(false);
    expect(bookSchema.safeParse({ ...valid, genreIds: [], genreNames: [] }).success).toBe(false);
    expect(bookSchema.safeParse({ ...valid, price: Number.NaN }).success).toBe(false);
    expect(bookSchema.safeParse({ ...valid, price: -1 }).success).toBe(false);
    expect(bookSchema.safeParse({ ...valid, price: 999999999 }).success).toBe(false);
    expect(bookSchema.safeParse({ ...valid, stock: 1.5 }).success).toBe(false);
    expect(bookSchema.safeParse({ ...valid, stock: -1 }).success).toBe(false);
    expect(bookSchema.safeParse({ ...valid, stock: 1000 }).success).toBe(true);
    expect(bookSchema.safeParse({ ...valid, stock: 1001 }).success).toBe(false);
    expect(bookSchema.safeParse({ ...valid, stock: 1000001 }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'no-es-correo', password: '123' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'admin@cmpc.cl', password: 'Admin123!' }).success).toBe(true);
  });

  it('arma el payload, el formulario y los géneros', () => {
    const existing = toBookPayload(valid);
    expect(existing.authorId).toBe('a1');
    expect(existing.publisherId).toBe('p1');
    const created = toBookPayload({
      ...valid,
      authorMode: 'new',
      authorName: '  Nuevo ',
      publisherMode: 'new',
      publisherName: ' Sur ',
    });
    expect(created.authorName).toBe('Nuevo');
    expect(created.publisherName).toBe('Sur');

    const form = toFormData(created, new File(['x'], 'a.png', { type: 'image/png' }));
    expect(form.get('authorName')).toBe('Nuevo');
    expect(form.get('image')).toBeInstanceOf(File);
    const withoutImage = toFormData(existing);
    expect(withoutImage.get('image')).toBeNull();
    expect(withoutImage.get('genreIds')).toBe('["g1"]');

    expect(toggleId(['a'], 'a')).toEqual([]);
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b']);
    expect(addGenreName([], '  ')).toEqual({ names: [], error: 'Escriba un género' });
    expect(addGenreName([], 'a'.repeat(61)).error).toMatch(/largo/);
    expect(addGenreName(['Terror'], 'terror').error).toMatch(/agregado/);
    expect(addGenreName(['Novela'], 'Terror').names).toEqual(['Novela', 'Terror']);

    const book: Book = {
      id: '1',
      title: 'Rayuela',
      price: 10,
      stock: 2,
      available: true,
      imageUrl: null,
      author: { id: 'a', name: 'Cortázar' },
      publisher: { id: 'p', name: 'Alfaguara' },
      genres: [{ id: 'g', name: 'Novela' }],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    expect(bookToForm(book).genreIds).toEqual(['g']);
  });
});
