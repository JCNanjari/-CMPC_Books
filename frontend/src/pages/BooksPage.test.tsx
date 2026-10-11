import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../services/apiClient';
import { downloadBooksExcel, listBooks } from '../services/bookService';
import { listAuthors, listGenres, listPublishers } from '../services/catalogService';
import { renderApp } from '../test/render';

vi.mock('../services/bookService', () => ({
  listBooks: vi.fn(),
  downloadBooksExcel: vi.fn(),
  getBook: vi.fn(),
  createBook: vi.fn(),
  updateBook: vi.fn(),
  removeBook: vi.fn(),
}));
vi.mock('../services/catalogService', () => ({
  listAuthors: vi.fn(),
  listPublishers: vi.fn(),
  listGenres: vi.fn(),
}));

const book = {
  id: '1',
  title: 'Rayuela',
  price: 18990,
  stock: 2,
  available: true,
  imageUrl: null,
  author: { id: 'a1', name: 'Cortázar' },
  publisher: { id: 'p1', name: 'Alfaguara' },
  genres: [{ id: 'g1', name: 'Novela' }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

function session() {
  localStorage.setItem('token', 'token');
  localStorage.setItem('user', JSON.stringify({ id: 'u', email: 'a@b.c', name: 'Ada' }));
}

describe('listado de libros', () => {
  beforeEach(() => {
    session();
    vi.mocked(listGenres).mockResolvedValue([{ id: 'g1', name: 'Novela' }]);
    vi.mocked(listAuthors).mockResolvedValue([{ id: 'a1', name: 'Cortázar' }]);
    vi.mocked(listPublishers).mockResolvedValue([{ id: 'p1', name: 'Alfaguara' }]);
    vi.mocked(listBooks).mockImplementation(async (params) => ({
      data: params.search === 'nada' ? [] : [book],
      meta: { page: params.page ?? 1, limit: 10, total: params.search === 'nada' ? 0 : 25, totalPages: params.search === 'nada' ? 1 : 3 },
    }));
    vi.mocked(downloadBooksExcel).mockResolvedValue();
  });

  it('filtra, ordena, pagina, exporta y limpia', async () => {
    const user = userEvent.setup();
    renderApp('/libros');
    expect(await screen.findByRole('link', { name: 'Rayuela' })).toBeInTheDocument();
    expect(screen.getByText('25 libros')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Buscar'), 'nada');
    expect(await screen.findByText('No hay libros con esos filtros.')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Buscar'));
    expect(await screen.findByRole('link', { name: 'Rayuela' })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Género'), 'g1');
    await user.selectOptions(screen.getByLabelText('Autor'), 'a1');
    await user.selectOptions(screen.getByLabelText('Editorial'), 'p1');
    await user.selectOptions(screen.getByLabelText('Disponibilidad'), 'true');
    await waitFor(() => expect(listBooks).toHaveBeenCalledWith(expect.objectContaining({ genreId: 'g1', available: 'true' })));

    await user.selectOptions(screen.getByLabelText('Ordenar'), 'price:asc');
    await waitFor(() => expect(listBooks).toHaveBeenCalledWith(expect.objectContaining({ sort: 'price:asc' })));
    await user.selectOptions(screen.getByLabelText('Ordenar'), 'author:desc');
    await waitFor(() => expect(listBooks).toHaveBeenCalledWith(expect.objectContaining({ sort: 'author:desc' })));
    await user.selectOptions(screen.getByLabelText('Ordenar'), 'createdAt:desc');

    await user.click(screen.getByRole('button', { name: 'Lista' }));
    const titleHeader = () => screen.getByRole('columnheader', { name: /Título/ });
    await user.click(within(titleHeader()).getByRole('button'));
    await user.click(within(titleHeader()).getByRole('button'));
    expect(within(titleHeader()).getByRole('button')).toHaveTextContent('↓');
    await user.click(screen.getByRole('button', { name: /Creación/ }));

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText('Página 2 de 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    await waitFor(() => expect(downloadBooksExcel).toHaveBeenCalled());
    vi.mocked(downloadBooksExcel).mockRejectedValueOnce('x');
    await user.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    expect(await screen.findByText('No se pudo completar la operación')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpiar' }));
    expect(screen.getByLabelText('Buscar')).toHaveValue('');
    expect(screen.getByLabelText('Ordenar')).toHaveValue('createdAt:desc');
  });

  it('abre en tarjetas y puede volver a la lista', async () => {
    const user = userEvent.setup();
    renderApp('/libros');
    expect(await screen.findByRole('link', { name: 'Rayuela' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tarjetas' })).toHaveAttribute('aria-pressed', 'true');
    const card = screen.getByRole('listitem');
    expect(within(card).getByRole('link', { name: 'Rayuela' })).toBeInTheDocument();
    expect(within(card).getByText('Cortázar')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Lista' }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('muestra errores de carga', async () => {
    vi.mocked(listBooks).mockRejectedValue(new ApiError(500, 'base caída'));
    renderApp('/libros');
    expect(await screen.findByRole('alert')).toHaveTextContent('base caída');
  });
});
