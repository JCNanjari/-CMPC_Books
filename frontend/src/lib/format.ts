const STOPWORDS = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'y', 'en']);

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return '';
  const digits = Number.isInteger(value) ? 0 : 2;
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: true,
  }).format(value);
}

export function caretFromDigitCount(formatted: string, digitCount: number): number {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted[index] ?? '')) {
      seen += 1;
      if (seen === digitCount) return index + 1;
    }
  }
  return formatted.length;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function availabilityLabel(available: boolean): string {
  return available ? 'Disponible' : 'Agotado';
}

export function initials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const meaningful = words.filter((word) => !STOPWORDS.has(word.toLocaleLowerCase('es')));
  const source = meaningful.length > 0 ? meaningful : words;
  return source
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export function coverHue(title: string): number {
  let hash = 0;
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const hues = [152, 168, 28, 200, 12, 88];
  return hues[hash % hues.length];
}

export function mediaUrl(path: string | null | undefined, api = import.meta.env.VITE_API_URL || '/api'): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  if (api.startsWith('http')) return `${api.replace(/\/api\/?$/, '')}${path}`;
  return path;
}
