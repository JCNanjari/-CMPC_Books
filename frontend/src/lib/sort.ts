export type SortDirection = 'asc' | 'desc';

export interface SortCriterion {
  field: string;
  direction: SortDirection;
}

const LABELS: Record<string, string> = {
  title: 'Título',
  author: 'Autor',
  publisher: 'Editorial',
  price: 'Precio',
  stock: 'Stock',
  createdAt: 'Creación',
};

export function sortLabel(field: string): string {
  return LABELS[field] ?? field;
}

export function toggleSort(current: SortCriterion[], field: string): SortCriterion[] {
  const index = current.findIndex((item) => item.field === field);
  if (index === -1) return [...current, { field, direction: 'asc' }];
  const next = current.slice();
  next[index] = {
    ...next[index],
    direction: next[index].direction === 'asc' ? 'desc' : 'asc',
  };
  return next;
}

export function removeSort(current: SortCriterion[], field: string): SortCriterion[] {
  return current.filter((item) => item.field !== field);
}

export function serializeSort(current: SortCriterion[]): string {
  return current.map((item) => `${item.field}:${item.direction}`).join(',');
}
