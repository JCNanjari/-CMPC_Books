import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { listAudit } from '../services/auditService';
import { renderApp } from '../test/render';

vi.mock('../services/auditService', () => ({ listAudit: vi.fn() }));

const entry = {
  id: '1',
  action: 'CREATE',
  entity: 'Book',
  entityId: 'abcdef12-3456-4789-a012-3456789abcde',
  ip: '127.0.0.1',
  metadata: { title: 'Rayuela' },
  createdAt: '2026-04-01T12:00:00.000Z',
  user: { id: 'u', email: 'a@b.c', name: 'Ada' },
};

describe('auditoría', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'token');
    localStorage.setItem('user', JSON.stringify({ id: 'u', email: 'a@b.c', name: 'Ada' }));
  });

  it('lista movimientos anónimos y paginados', async () => {
    vi.mocked(listAudit).mockImplementation(async (page = 1) => ({
      data: page === 1 ? [{ ...entry, user: null, entityId: null, ip: null, metadata: null }] : [entry],
      meta: { page, limit: 20, total: 21, totalPages: 2 },
    }));
    renderApp('/auditoria');
    expect(await screen.findByText('Anónimo')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Alta')).toBeInTheDocument();
    expect(screen.getByText('un libro')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    const book = await screen.findByRole('link', { name: '«Rayuela»' });
    expect(book).toHaveAttribute('href', '/libros/abcdef12-3456-4789-a012-3456789abcde');
  });

  it('cubre el vacío y el error', async () => {
    vi.mocked(listAudit).mockResolvedValueOnce({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    renderApp('/auditoria');
    expect(await screen.findByText('Todavía no hay movimientos.')).toBeInTheDocument();

    vi.mocked(listAudit).mockRejectedValueOnce(new Error('caída'));
    renderApp('/auditoria');
    expect(await screen.findByRole('alert')).toHaveTextContent('caída');
  });
});
