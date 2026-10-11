import { availabilityLabel, caretFromDigitCount, coverHue, formatAmount, formatDate, formatPrice, initials, mediaUrl } from './format';
import { removeSort, serializeSort, sortLabel, toggleSort } from './sort';
import { toSearchParams } from './query';
import { validateImage, MAX_IMAGE_BYTES } from './image';
import { saveBlob } from './download';

describe('formato', () => {
  it('formatea precios, fechas, iniciales y portadas', () => {
    expect(formatPrice(18990)).toMatch(/18\.990/);
    expect(formatAmount(12990)).toMatch(/^12\.990$/);
    expect(formatAmount(Number.NaN)).toBe('');
    expect(caretFromDigitCount('12.990', 0)).toBe(0);
    expect(caretFromDigitCount('1.299', 3)).toBe(4);
    expect(caretFromDigitCount('12.990', 5)).toBe(6);
    expect(formatPrice(10.5)).toMatch(/10,5|10.5/);
    expect(formatDate('2026-03-01T15:00:00.000Z')).toEqual(expect.any(String));
    expect(availabilityLabel(true)).toBe('Disponible');
    expect(availabilityLabel(false)).toBe('Agotado');
    expect(initials('El amor en los tiempos')).toBe('AT');
    expect(initials('1984')).toBe('1');
    expect(initials('   ')).toBe('');
    expect(coverHue('Rayuela')).toBeGreaterThanOrEqual(0);
    expect(mediaUrl(null)).toBeNull();
    expect(mediaUrl('')).toBeNull();
    expect(mediaUrl('https://cdn/a.jpg')).toBe('https://cdn/a.jpg');
    expect(mediaUrl('/api/uploads/a.jpg', '/api')).toBe('/api/uploads/a.jpg');
    expect(mediaUrl('/api/uploads/a.jpg', 'http://localhost:3000/api')).toBe(
      'http://localhost:3000/api/uploads/a.jpg',
    );
    expect(mediaUrl('/api/uploads/a.jpg', 'http://localhost:3000/api/')).toBe(
      'http://localhost:3000/api/uploads/a.jpg',
    );
  });

  it('compone el orden y la consulta', () => {
    expect(sortLabel('title')).toBe('Título');
    expect(sortLabel('otro')).toBe('otro');
    expect(toggleSort([], 'title')).toEqual([{ field: 'title', direction: 'asc' }]);
    expect(toggleSort([{ field: 'title', direction: 'asc' }], 'title')).toEqual([
      { field: 'title', direction: 'desc' },
    ]);
    expect(removeSort([{ field: 'title', direction: 'asc' }], 'title')).toEqual([]);
    expect(serializeSort([{ field: 'price', direction: 'desc' }])).toBe('price:desc');
    expect(
      toSearchParams({
        page: 2,
        limit: 10,
        search: 'ray',
        genreId: 'g',
        authorId: 'a',
        publisherId: 'p',
        available: 'true',
        sort: 'title:asc',
      }),
    ).toContain('search=ray');
    expect(toSearchParams({})).toBe('');
  });

  it('valida imágenes y descarga un archivo', () => {
    expect(validateImage(new File(['x'], 'a.gif', { type: 'image/gif' }))).toMatch(/JPG/);
    expect(
      validateImage(new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'a.png', { type: 'image/png' })),
    ).toMatch(/2 MB/);
    expect(validateImage(new File(['x'], 'a.png', { type: 'image/png' }))).toBeNull();

    const click = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation(() => ({ click, remove: vi.fn() }) as unknown as HTMLAnchorElement);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:1');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    saveBlob(new Blob(['a']), 'libros.xlsx');
    expect(click).toHaveBeenCalled();
  });
});
