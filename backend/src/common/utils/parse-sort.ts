export type SortDirection = 'asc' | 'desc';

export interface SortResult {
  orderBy?: Array<Record<string, unknown>>;
  error?: string;
}

const ALLOWED = new Set(['title', 'price', 'stock', 'createdAt', 'author', 'publisher']);

export function parseSort(sort?: string): SortResult {
  if (!sort?.trim()) {
    return { orderBy: [{ createdAt: 'desc' }] };
  }

  const parts = sort
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { orderBy: [{ createdAt: 'desc' }] };
  }

  const orderBy: Array<Record<string, unknown>> = [];
  for (const part of parts) {
    const [field, direction] = part.split(':');
    if (!field || !ALLOWED.has(field) || (direction !== 'asc' && direction !== 'desc')) {
      return { error: `Ordenamiento inválido: ${part}` };
    }
    if (field === 'author') orderBy.push({ author: { name: direction } });
    else if (field === 'publisher') orderBy.push({ publisher: { name: direction } });
    else orderBy.push({ [field]: direction });
  }

  return { orderBy };
}
