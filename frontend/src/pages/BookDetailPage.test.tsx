import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../services/apiClient';
import { getBook, listBooks, removeBook } from '../services/bookService';
import { listAuthors, listGenres, listPublishers } from '../services/catalogService';
import { renderApp } from '../test/render';

vi.mock('../services/bookService', () => ({
  getBook: vi.fn(),
  removeBook: vi.fn(),
  listBooks: vi.fn(),
  downloadBooksExcel: vi.fn(),
  createBook: vi.fn(),
  updateBook: vi.fn(),
}));
vi.mock('../services/catalogService', () => ({
  listAuthors: vi.fn(),
  listPublishers: vi.fn(),
  listGenres: vi.fn(),
}));

const book = {
  id: '1',
  title: 'Rayuela',
  price: 10.5,
  stock: 0,
  available: false,
  imageUrl: '/api/uploads/rayuela.jpg',
  author: { id: 'a', name: 'Cortázar' },
  publisher: { id: 'p', name: 'Alfaguara' },
  genres: [{ id: 'g', name: 'Novela' }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('detalle de libro', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'token');
    localStorage.setItem('user', JSON.stringify({ id: 'u', email: 'a@b.c', name: 'Ada' }));
    vi.mocked(listBooks).mockResolvedValue({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } });
    vi.mocked(listAuthors).mockResolvedValue([]);
    vi.mocked(listPublishers).mockResolvedValue([]);
    vi.mocked(listGenres).mockResolvedValue([]);
  });

  it('muestra la ficha, confirma la baja y vuelve al listado', async () => {
    let resolveBook: (value: typeof book) => void = () => undefined;
    vi.mocked(getBook).mockReturnValue(new Promise((resolve) => { resolveBook = resolve; }));
    renderApp('/libros/1');
    expect(screen.getByText('Cargando libro…')).toBeInTheDocument();
    resolveBook(book);
    expect(await screen.findByRole('heading', { name: 'Rayuela' })).toBeInTheDocument();
    expect(screen.getByText('Agotado')).toBeInTheDocument();
    expect(screen.getByAltText('Portada de Rayuela')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    await user.click(screen.getByRole('dialog'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    vi.mocked(removeBook).mockRejectedValueOnce(new Error('no se pudo'));
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('no se pudo');

    vi.mocked(removeBook).mockResolvedValueOnce({ id: '1', deleted: true });
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByRole('heading', { name: 'Libros' })).toBeInTheDocument();
  });

  it('informa si el libro no existe', async () => {
    vi.mocked(getBook).mockRejectedValue('x');
    renderApp('/libros/1');
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el libro');
  });

  it('muestra el mensaje de la API', async () => {
    vi.mocked(getBook).mockRejectedValue(new ApiError(404, 'Libro no encontrado'));
    renderApp('/libros/1');
    expect(await screen.findByRole('alert')).toHaveTextContent('Libro no encontrado');
  });
});
