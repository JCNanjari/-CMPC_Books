import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../services/apiClient';
import { createBook, getBook, listBooks, updateBook } from '../services/bookService';
import { listAuthors, listGenres, listPublishers } from '../services/catalogService';
import { renderApp } from '../test/render';

vi.mock('../services/bookService', () => ({
  getBook: vi.fn(),
  createBook: vi.fn(),
  updateBook: vi.fn(),
  listBooks: vi.fn(),
  removeBook: vi.fn(),
  downloadBooksExcel: vi.fn(),
}));
vi.mock('../services/catalogService', () => ({
  listAuthors: vi.fn(),
  listPublishers: vi.fn(),
  listGenres: vi.fn(),
}));

const book = {
  id: '1',
  title: 'Rayuela',
  price: 19990,
  stock: 4,
  available: true,
  imageUrl: null,
  author: { id: 'a1', name: 'Cortázar' },
  publisher: { id: 'p1', name: 'Alfaguara' },
  genres: [{ id: 'g1', name: 'Novela' }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('formulario de libro', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'token');
    localStorage.setItem('user', JSON.stringify({ id: 'u', email: 'a@b.c', name: 'Ada' }));
    vi.mocked(listGenres).mockResolvedValue([{ id: 'g1', name: 'Novela' }]);
    vi.mocked(listAuthors).mockResolvedValue([{ id: 'a1', name: 'Cortázar' }]);
    vi.mocked(listPublishers).mockResolvedValue([{ id: 'p1', name: 'Alfaguara' }]);
    vi.mocked(getBook).mockResolvedValue(book);
    vi.mocked(listBooks).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });
  });

  it('valida, pide la imagen y crea el libro', async () => {
    const user = userEvent.setup();
    renderApp('/libros/nuevo');
    expect(await screen.findByRole('heading', { name: 'Nuevo libro' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('El título es obligatorio')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Título'), 'Altazor');
    await user.selectOptions(screen.getByLabelText('Autor'), 'a1');
    await user.selectOptions(screen.getByLabelText('Autor'), '');
    await user.type(screen.getByLabelText('Nombre del autor'), 'Huidobro');
    await user.selectOptions(screen.getByLabelText('Editorial'), '');
    await user.type(screen.getByLabelText('Nombre de la editorial'), 'Universitaria');
    await user.click(screen.getByRole('checkbox', { name: 'Novela' }));
    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(screen.getByText('Escriba un género')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Agregar género'), 'Terror');
    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    await user.click(screen.getByRole('button', { name: 'Terror ×' }));
    await user.type(screen.getByLabelText('Precio (CLP)'), '12990');
    expect(screen.getByLabelText('Precio (CLP)')).toHaveValue('12.990');
    const stock = screen.getByLabelText('Stock');
    expect(stock).toHaveAttribute('max', '1000');
    expect(stock).toHaveClass('no-spin');
    await user.type(stock, '3');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('La imagen es obligatoria')).toBeInTheDocument();

    const input = screen.getByLabelText('Imagen');
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.gif', { type: 'image/gif' })] } });
    expect(screen.getByText('La imagen debe ser JPG, PNG o WEBP')).toBeInTheDocument();
    fireEvent.change(input, { target: { files: [] } });
    await user.upload(input, new File(['x'], 'a.png', { type: 'image/png' }));
    expect(await screen.findByAltText('Vista previa de la portada')).toBeInTheDocument();

    vi.mocked(createBook).mockRejectedValueOnce(new ApiError(400, 'El autor no existe'));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findAllByText('El autor no existe')).toHaveLength(2);

    vi.mocked(createBook).mockResolvedValueOnce({ ...book, id: '9', title: 'Altazor' });
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('heading', { name: 'Libros' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Libro agregado');
    expect(createBook).toHaveBeenCalled();
  });

  it('edita sin reemplazar la imagen', async () => {
    const user = userEvent.setup();
    renderApp('/libros/1/editar');
    expect(await screen.findByDisplayValue('Rayuela')).toBeInTheDocument();
    vi.mocked(updateBook).mockResolvedValue(book);
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('heading', { name: 'Rayuela' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Libro actualizado');
    expect(updateBook).toHaveBeenCalled();
  });

  it('avisa si no puede cargar el libro a editar', async () => {
    vi.mocked(getBook).mockRejectedValue(new Error('timeout'));
    renderApp('/libros/1/editar');
    expect(await screen.findByRole('alert')).toHaveTextContent('timeout');
  });
});
