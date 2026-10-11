import { AuditEntry } from '../types';

export interface AuditPhrase {
  label: string;
  tone: 'ok' | 'off' | '';
  subject: string;
  href: string | null;
}

function record(metadata: unknown): Record<string, unknown> | null {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return null;
}

function textOf(metadata: unknown, key: string): string | null {
  const value = record(metadata)?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function countOf(metadata: unknown, key: string): number | null {
  const value = record(metadata)?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function bookSubject(title: string | null): string {
  return title ? `«${title}»` : 'un libro';
}

export function describeAudit(entry: Pick<AuditEntry, 'action' | 'entity' | 'entityId' | 'metadata'>): AuditPhrase {
  const title = textOf(entry.metadata, 'title');
  const email = textOf(entry.metadata, 'email');
  const bookHref = entry.entity === 'Book' && entry.entityId ? `/libros/${entry.entityId}` : null;

  switch (entry.action) {
    case 'CREATE':
      return { label: 'Alta', tone: 'ok', subject: bookSubject(title), href: bookHref };
    case 'UPDATE':
      return { label: 'Edición', tone: '', subject: bookSubject(title), href: bookHref };
    case 'DELETE':
      return { label: 'Baja', tone: 'off', subject: bookSubject(title), href: null };
    case 'EXPORT': {
      const total = countOf(entry.metadata, 'total');
      const subject =
        total === null
          ? 'archivo Excel'
          : total === 0
            ? 'archivo Excel sin libros'
            : total === 1
              ? 'archivo Excel con 1 libro'
              : `archivo Excel con ${total} libros`;
      return { label: 'Descarga', tone: '', subject, href: null };
    }
    case 'LOGIN':
      return { label: 'Ingreso', tone: 'ok', subject: email ?? 'la sesión', href: null };
    case 'LOGIN_FAILED':
      return { label: 'Ingreso fallido', tone: 'off', subject: email ?? 'credenciales rechazadas', href: null };
    default:
      return { label: entry.action, tone: '', subject: entry.entity, href: null };
  }
}
