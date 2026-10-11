import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cover } from '../components/Cover';
import { ErrorBanner } from '../components/ErrorBanner';
import { Pagination } from '../components/Pagination';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { availabilityLabel, formatPrice } from '../lib/format';
import { removeSort, serializeSort, sortLabel, SortCriterion, toggleSort } from '../lib/sort';
import { ApiError } from '../services/apiClient';
import { downloadBooksExcel, listBooks } from '../services/bookService';
import { listAuthors, listGenres, listPublishers } from '../services/catalogService';
import type { Book } from '../types';

type CatalogView = 'list' | 'cards';

function storedView(): CatalogView {
  return localStorage.getItem('books-view') === 'list' ? 'list' : 'cards';
}

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Más recientes' },
  { value: 'createdAt:asc', label: 'Más antiguos' },
  { value: 'title:asc', label: 'Título A-Z' },
  { value: 'title:desc', label: 'Título Z-A' },
  { value: 'author:asc', label: 'Autor A-Z' },
  { value: 'author:desc', label: 'Autor Z-A' },
  { value: 'publisher:asc', label: 'Editorial A-Z' },
  { value: 'publisher:desc', label: 'Editorial Z-A' },
  { value: 'price:asc', label: 'Precio: menor a mayor' },
  { value: 'price:desc', label: 'Precio: mayor a menor' },
  { value: 'stock:asc', label: 'Stock: menor a mayor' },
  { value: 'stock:desc', label: 'Stock: mayor a menor' },
];

function sortKey(sort: SortCriterion[]): string {
  if (sort.length !== 1) return 'custom';
  return `${sort[0].field}:${sort[0].direction}`;
}

const COLUMNS = [
  { field: 'title', label: 'Título' },
  { field: 'author', label: 'Autor' },
  { field: 'publisher', label: 'Editorial' },
  { field: 'price', label: 'Precio' },
  { field: 'stock', label: 'Stock' },
];

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'No se pudo completar la operación';
}

function BookCards({ books }: { books: Book[] }) {
  return (
    <ul className="book-grid">
      {books.map((book) => (
        <li key={book.id} className="book-card">
          <Cover title={book.title} imageUrl={book.imageUrl} size="md" />
          <div className="book-card-body">
            <h2>
              <Link to={`/libros/${book.id}`}>{book.title}</Link>
            </h2>
            <p>{book.author.name}</p>
            <p className="muted">{book.publisher.name}</p>
            <p className="book-card-genres">{book.genres.map((genre) => genre.name).join(', ')}</p>
            <div className="book-card-foot">
              <span className="book-card-price">{formatPrice(book.price)}</span>
              <span className={book.available ? 'badge ok' : 'badge off'}>{availabilityLabel(book.available)}</span>
            </div>
            <p className="muted">Stock {book.stock}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function BooksPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput, 350);
  const [genreId, setGenreId] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [publisherId, setPublisherId] = useState('');
  const [available, setAvailable] = useState<'' | 'true' | 'false'>('');
  const [sort, setSort] = useState<SortCriterion[]>([{ field: 'createdAt', direction: 'desc' }]);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<CatalogView>(storedView);
  const [exportError, setExportError] = useState<string | null>(null);

  const selectView = (next: CatalogView) => {
    setView(next);
    localStorage.setItem('books-view', next);
  };

  useEffect(() => {
    setPage(1);
  }, [search, genreId, authorId, publisherId, available, sort]);

  const params = {
    page,
    limit: 10,
    search,
    genreId,
    authorId,
    publisherId,
    available,
    sort: serializeSort(sort),
  };

  const books = useQuery({ queryKey: ['books', params], queryFn: () => listBooks(params) });
  const genres = useQuery({ queryKey: ['genres'], queryFn: listGenres });
  const authors = useQuery({ queryKey: ['authors'], queryFn: listAuthors });
  const publishers = useQuery({ queryKey: ['publishers'], queryFn: listPublishers });

  const exporter = useMutation({
    mutationFn: () => downloadBooksExcel(params),
    onSuccess: () => setExportError(null),
    onError: (error) => setExportError(messageOf(error)),
  });

  const clearFilters = () => {
    setSearchInput('');
    setGenreId('');
    setAuthorId('');
    setPublisherId('');
    setAvailable('');
    setSort([{ field: 'createdAt', direction: 'desc' }]);
    setPage(1);
    queryClient.removeQueries({ queryKey: ['books'] });
  };

  const directionFor = (field: string) => sort.find((item) => item.field === field)?.direction;

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Catálogo</p>
          <h1>Libros</h1>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" type="button" onClick={() => exporter.mutate()} disabled={exporter.isPending}>
            {exporter.isPending ? 'Exportando…' : 'Exportar Excel'}
          </button>
          <Link className="btn btn-primary" to="/libros/nuevo">
            Nuevo libro
          </Link>
        </div>
      </div>

      <ErrorBanner message={exportError} />
      <ErrorBanner message={books.isError ? messageOf(books.error) : null} />

      <div className="filters">
        <label>
          Buscar
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Título, autor o editorial"
          />
        </label>
        <label>
          Género
          <select value={genreId} onChange={(event) => setGenreId(event.target.value)}>
            <option value="">Todos</option>
            {genres.data?.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Autor
          <select value={authorId} onChange={(event) => setAuthorId(event.target.value)}>
            <option value="">Todos</option>
            {authors.data?.map((author) => (
              <option key={author.id} value={author.id}>
                {author.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Editorial
          <select value={publisherId} onChange={(event) => setPublisherId(event.target.value)}>
            <option value="">Todas</option>
            {publishers.data?.map((publisher) => (
              <option key={publisher.id} value={publisher.id}>
                {publisher.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Disponibilidad
          <select value={available} onChange={(event) => setAvailable(event.target.value as '' | 'true' | 'false')}>
            <option value="">Todas</option>
            <option value="true">Disponible</option>
            <option value="false">Agotado</option>
          </select>
        </label>
        <label>
          Ordenar
          <select
            value={sortKey(sort)}
            onChange={(event) => {
              const [field, direction] = event.target.value.split(':');
              if (direction === 'asc' || direction === 'desc') setSort([{ field, direction }]);
            }}
          >
            {sortKey(sort) === 'custom' && <option value="custom">Varios criterios</option>}
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-ghost" type="button" onClick={clearFilters}>
          Limpiar
        </button>
      </div>

      <div className="catalog-tools">
        <div className="sort-bar" aria-label="Orden activo">
          {sort.map((item) => (
            <button key={item.field} type="button" className="chip" onClick={() => setSort(removeSort(sort, item.field))}>
              {sortLabel(item.field)} {item.direction === 'asc' ? '↑' : '↓'} ×
            </button>
          ))}
        </div>
        <div className="view-switch" role="group" aria-label="Vista del catálogo">
          <button type="button" aria-pressed={view === 'list'} onClick={() => selectView('list')}>
            Lista
          </button>
          <button type="button" aria-pressed={view === 'cards'} onClick={() => selectView('cards')}>
            Tarjetas
          </button>
        </div>
      </div>

      {books.isLoading && <p className="muted">Cargando libros…</p>}
      {books.data && books.data.data.length === 0 && <p className="muted">No hay libros con esos filtros.</p>}

      {books.data && books.data.data.length > 0 && (
        <>
          <p className="muted">{books.data.meta.total} libros</p>
          {view === 'cards' ? (
            <BookCards books={books.data.data} />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th aria-hidden="true" />
                    {COLUMNS.map((column) => {
                      const direction = directionFor(column.field);
                      return (
                        <th key={column.field} aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}>
                          <button type="button" onClick={() => setSort(toggleSort(sort, column.field))}>
                            {column.label}
                            {direction === 'asc' ? ' ↑' : direction === 'desc' ? ' ↓' : ''}
                          </button>
                        </th>
                      );
                    })}
                    <th>Géneros</th>
                    <th>Disponibilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {books.data.data.map((book) => (
                    <tr key={book.id}>
                      <td>
                        <Cover title={book.title} imageUrl={book.imageUrl} size="sm" />
                      </td>
                      <td>
                        <Link to={`/libros/${book.id}`}>{book.title}</Link>
                      </td>
                      <td>{book.author.name}</td>
                      <td>{book.publisher.name}</td>
                      <td>{formatPrice(book.price)}</td>
                      <td>{book.stock}</td>
                      <td>{book.genres.map((genre) => genre.name).join(', ')}</td>
                      <td>
                        <span className={book.available ? 'badge ok' : 'badge off'}>
                          {availabilityLabel(book.available)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={books.data.meta.page} totalPages={books.data.meta.totalPages} onPage={setPage} />
        </>
      )}
    </section>
  );
}
