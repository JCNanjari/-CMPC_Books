import { describeAudit } from './audit';

const base = { entity: 'Book', entityId: 'abc', metadata: null };

describe('describeAudit', () => {
  it('nombra el libro y lo enlaza si sigue en el catálogo', () => {
    expect(describeAudit({ ...base, action: 'CREATE', metadata: { title: 'Rayuela' } })).toEqual({
      label: 'Alta',
      tone: 'ok',
      subject: '«Rayuela»',
      href: '/libros/abc',
    });
    expect(describeAudit({ ...base, action: 'UPDATE', metadata: { title: '  ' } })).toEqual({
      label: 'Edición',
      tone: '',
      subject: 'un libro',
      href: '/libros/abc',
    });
    expect(describeAudit({ ...base, action: 'CREATE', entityId: null, metadata: { title: 1 } })).toEqual({
      label: 'Alta',
      tone: 'ok',
      subject: 'un libro',
      href: null,
    });
    expect(describeAudit({ action: 'DELETE', entity: 'Book', entityId: 'abc', metadata: { title: 'Rayuela', soft: true } })).toEqual({
      label: 'Baja',
      tone: 'off',
      subject: '«Rayuela»',
      href: null,
    });
  });

  it('describe exportaciones, sesiones y lo que no reconoce', () => {
    expect(describeAudit({ action: 'EXPORT', entity: 'Book', entityId: null, metadata: { total: 12 } })).toMatchObject({
      label: 'Descarga',
      subject: 'archivo Excel con 12 libros',
    });
    expect(describeAudit({ action: 'EXPORT', entity: 'Book', entityId: null, metadata: { total: 1 } }).subject).toBe(
      'archivo Excel con 1 libro',
    );
    expect(describeAudit({ action: 'EXPORT', entity: 'Book', entityId: null, metadata: { total: 0 } }).subject).toBe(
      'archivo Excel sin libros',
    );
    expect(describeAudit({ action: 'EXPORT', entity: 'Book', entityId: null, metadata: { total: Number.NaN } }).subject).toBe(
      'archivo Excel',
    );
    expect(describeAudit({ action: 'EXPORT', entity: 'Book', entityId: null, metadata: [] }).subject).toBe('archivo Excel');
    expect(describeAudit({ action: 'LOGIN', entity: 'User', entityId: 'u', metadata: { email: 'a@b.c' } })).toMatchObject({
      label: 'Ingreso',
      subject: 'a@b.c',
      href: null,
    });
    expect(describeAudit({ action: 'LOGIN', entity: 'User', entityId: null, metadata: null }).subject).toBe('la sesión');
    expect(describeAudit({ action: 'LOGIN_FAILED', entity: 'User', entityId: null, metadata: { email: 'a@b.c' } })).toMatchObject({
      label: 'Ingreso fallido',
      tone: 'off',
      subject: 'a@b.c',
    });
    expect(describeAudit({ action: 'LOGIN_FAILED', entity: 'User', entityId: null, metadata: { email: '' } }).subject).toBe(
      'credenciales rechazadas',
    );
    expect(describeAudit({ action: 'PING', entity: 'User', entityId: 'u', metadata: null })).toEqual({
      label: 'PING',
      tone: '',
      subject: 'User',
      href: null,
    });
  });
});
