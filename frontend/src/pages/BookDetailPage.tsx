import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Cover } from '../components/Cover';
import { ErrorBanner } from '../components/ErrorBanner';
import { Modal } from '../components/Modal';
import { availabilityLabel, formatDate, formatPrice } from '../lib/format';
import { ApiError } from '../services/apiClient';
import { getBook, removeBook } from '../services/bookService';

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'No se pudo cargar el libro';
}

export function BookDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const book = useQuery({ queryKey: ['book', id], queryFn: () => getBook(id), enabled: Boolean(id) });
  const deletion = useMutation({
    mutationFn: () => removeBook(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['books'] });
      navigate('/libros');
    },
  });

  if (book.isLoading) return <p className="muted">Cargando libro…</p>;
  if (book.isError || !book.data) return <ErrorBanner message={messageOf(book.error)} />;

  const item = book.data;
  return (
    <article className="detail">
      <div className="detail-cover">
        <Cover title={item.title} imageUrl={item.imageUrl} size="lg" />
      </div>
      <div className="detail-body">
        <div className="detail-head">
          <p className="eyebrow">Ficha</p>
          <span className={item.available ? 'badge ok' : 'badge off'}>{availabilityLabel(item.available)}</span>
        </div>
        <h1>{item.title}</h1>
        <div className="detail-byline">
          <p>
            <span>Autor</span>
            <strong>{item.author.name}</strong>
          </p>
          <p>
            <span>Editorial</span>
            <strong>{item.publisher.name}</strong>
          </p>
        </div>
        <dl className="metrics">
          <div className="metric">
            <dt>Precio</dt>
            <dd>{formatPrice(item.price)}</dd>
          </div>
          <div className={item.stock === 0 ? 'metric metric-empty' : 'metric'}>
            <dt>Stock</dt>
            <dd>
              {item.stock}
              <span>{item.stock === 1 ? 'unidad' : 'unidades'}</span>
            </dd>
          </div>
        </dl>
        <p className="detail-label">Géneros</p>
        <div className="genre-list">
          {item.genres.map((genre) => (
            <span key={genre.id} className="chip">
              {genre.name}
            </span>
          ))}
        </div>
        <div className="detail-foot">
          <dl className="detail-meta">
            <div>
              <dt>Alta</dt>
              <dd>{formatDate(item.createdAt)}</dd>
            </div>
            <div>
              <dt>Actualización</dt>
              <dd>{formatDate(item.updatedAt)}</dd>
            </div>
          </dl>
          <ErrorBanner message={deletion.isError ? messageOf(deletion.error) : null} />
          <div className="actions">
            <Link className="btn btn-primary" to={`/libros/${item.id}/editar`}>
              Editar
            </Link>
            <button className="btn btn-danger" type="button" onClick={() => setConfirming(true)}>
              Eliminar
            </button>
            <Link className="btn btn-ghost" to="/libros">
              Volver
            </Link>
          </div>
        </div>
      </div>
      {confirming && (
        <Modal title="Eliminar libro" onClose={() => setConfirming(false)}>
          <p>
            «{item.title}» dejará de aparecer en el inventario. El registro se conserva para auditoría.
          </p>
          <div className="actions">
            <button className="btn btn-ghost" type="button" onClick={() => setConfirming(false)}>
              Cancelar
            </button>
            <button className="btn btn-danger" type="button" onClick={() => deletion.mutate()} disabled={deletion.isPending}>
              {deletion.isPending ? 'Eliminando…' : 'Confirmar'}
            </button>
          </div>
        </Modal>
      )}
    </article>
  );
}
