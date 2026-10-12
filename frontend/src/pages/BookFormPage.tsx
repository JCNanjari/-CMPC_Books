import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Cover } from '../components/Cover';
import { ErrorBanner } from '../components/ErrorBanner';
import { useToast } from '../components/Toast';
import {
  addGenreName,
  bookSchema,
  BookFormValues,
  bookToForm,
  emptyBookForm,
  toBookPayload,
  toFormData,
  toggleId,
} from '../lib/bookForm';
import { caretFromDigitCount, formatAmount } from '../lib/format';
import { validateImage } from '../lib/image';
import { ApiError } from '../services/apiClient';
import { createBook, getBook, updateBook } from '../services/bookService';
import { listAuthors, listGenres, listPublishers } from '../services/catalogService';

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'No se pudo guardar el libro';
}

export function BookFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [genreDraft, setGenreDraft] = useState('');
  const [genreError, setGenreError] = useState<string | null>(null);
  const priceCaret = useRef<number | null>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  const book = useQuery({
    queryKey: ['book', id],
    queryFn: () => getBook(id ?? ''),
    enabled: editing,
  });
  const authors = useQuery({ queryKey: ['authors'], queryFn: listAuthors });
  const publishers = useQuery({ queryKey: ['publishers'], queryFn: listPublishers });
  const genres = useQuery({ queryKey: ['genres'], queryFn: listGenres });

  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    mode: 'onChange',
    defaultValues: emptyBookForm,
  });

  useEffect(() => {
    if (book.data) form.reset(bookToForm(book.data));
  }, [book.data, form]);

  useEffect(() => {
    if (!image) return undefined;
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const mutation = useMutation({
    mutationFn: (body: FormData) => (id ? updateBook(id, body) : createBook(body)),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['books'] });
      await queryClient.invalidateQueries({ queryKey: ['authors'] });
      await queryClient.invalidateQueries({ queryKey: ['publishers'] });
      await queryClient.invalidateQueries({ queryKey: ['genres'] });
      showToast(editing ? 'Libro actualizado' : 'Libro agregado');
      navigate(editing ? `/libros/${saved.id}` : '/libros');
    },
    onError: (error) => {
      showToast(messageOf(error), 'error');
    },
  });

  const values = form.watch();
  const priceText = formatAmount(values.price);

  useLayoutEffect(() => {
    const input = priceInputRef.current;
    const digits = priceCaret.current;
    if (!input || digits == null) return;
    const pos = caretFromDigitCount(input.value, digits);
    input.setSelectionRange(pos, pos);
    priceCaret.current = null;
  }, [priceText]);

  const onSubmit = form.handleSubmit((formValues) => {
    if (!editing && !image) {
      setImageError('La imagen es obligatoria');
      return;
    }
    setImageError(null);
    mutation.mutate(toFormData(toBookPayload(formValues), image));
  });

  const onImage = (file?: File) => {
    if (!file) {
      setImage(null);
      setImageError(null);
      return;
    }
    const problem = validateImage(file);
    setImageError(problem);
    if (!problem) setImage(file);
  };

  if (editing && book.isLoading) return <p className="muted">Cargando libro…</p>;
  if (editing && book.isError) return <ErrorBanner message={messageOf(book.error)} />;

  return (
    <section>
      <p className="eyebrow">{editing ? 'Edición' : 'Alta'}</p>
      <h1>{editing ? 'Editar libro' : 'Nuevo libro'}</h1>
      <form className="card form form-grid" onSubmit={onSubmit} noValidate>
        <ErrorBanner message={mutation.isError ? messageOf(mutation.error) : null} />
        <label>
          Título
          <input {...form.register('title')} />
        </label>
        {form.formState.errors.title && <small>{form.formState.errors.title.message}</small>}
        <div className="split">
          <label>
            Autor
            <select
              value={values.authorMode === 'existing' ? values.authorId : ''}
              onChange={(event) => {
                const next = event.target.value;
                form.setValue('authorMode', next ? 'existing' : 'new', { shouldValidate: true });
                form.setValue('authorId', next, { shouldValidate: true });
                if (next) form.setValue('authorName', '');
              }}
            >
              <option value="">Nuevo autor…</option>
              {authors.data?.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.name}
                </option>
              ))}
            </select>
          </label>
          {form.formState.errors.authorId && <small>{form.formState.errors.authorId.message}</small>}
          {values.authorMode === 'new' && (
            <label>
              Nombre del autor
              <input {...form.register('authorName')} />
            </label>
          )}
          {form.formState.errors.authorName && <small>{form.formState.errors.authorName.message}</small>}
        </div>
        <div className="split">
          <label>
            Editorial
            <select
              value={values.publisherMode === 'existing' ? values.publisherId : ''}
              onChange={(event) => {
                const next = event.target.value;
                form.setValue('publisherMode', next ? 'existing' : 'new', { shouldValidate: true });
                form.setValue('publisherId', next, { shouldValidate: true });
                if (next) form.setValue('publisherName', '');
              }}
            >
              <option value="">Nueva editorial…</option>
              {publishers.data?.map((publisher) => (
                <option key={publisher.id} value={publisher.id}>
                  {publisher.name}
                </option>
              ))}
            </select>
          </label>
          {form.formState.errors.publisherId && <small>{form.formState.errors.publisherId.message}</small>}
          {values.publisherMode === 'new' && (
            <label>
              Nombre de la editorial
              <input {...form.register('publisherName')} />
            </label>
          )}
          {form.formState.errors.publisherName && <small>{form.formState.errors.publisherName.message}</small>}
        </div>
        <fieldset>
          <legend>Géneros</legend>
          <div className="checks">
            {genres.data?.map((genre) => (
              <label key={genre.id} className="check">
                <input
                  type="checkbox"
                  checked={values.genreIds.includes(genre.id)}
                  onChange={() => form.setValue('genreIds', toggleId(values.genreIds, genre.id), { shouldValidate: true })}
                />
                {genre.name}
              </label>
            ))}
          </div>
          <div className="inline">
            <input
              aria-label="Agregar género"
              value={genreDraft}
              onChange={(event) => setGenreDraft(event.target.value)}
              placeholder="Otro género"
            />
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => {
                const result = addGenreName(values.genreNames, genreDraft);
                setGenreError(result.error ?? null);
                if (!result.error) {
                  form.setValue('genreNames', result.names, { shouldValidate: true });
                  setGenreDraft('');
                }
              }}
            >
              Agregar
            </button>
          </div>
          <div className="sort-bar">
            {values.genreNames.map((name) => (
              <button
                key={name}
                type="button"
                className="chip"
                onClick={() =>
                  form.setValue(
                    'genreNames',
                    values.genreNames.filter((item) => item !== name),
                    { shouldValidate: true },
                  )
                }
              >
                {name} ×
              </button>
            ))}
          </div>
          {(form.formState.errors.genreIds || genreError) && (
            <small>{form.formState.errors.genreIds?.message ?? genreError}</small>
          )}
        </fieldset>
        <div className="split">
          <label>
            Precio (CLP)
            <input
              ref={priceInputRef}
              name="price"
              inputMode="numeric"
              autoComplete="off"
              value={priceText}
              onChange={(event) => {
                const raw = event.target.value;
                const cursor = event.target.selectionStart ?? raw.length;
                priceCaret.current = raw.slice(0, cursor).replace(/\D/g, '').length;
                const digits = raw.replace(/\D/g, '');
                form.setValue('price', digits ? Number(digits) : Number.NaN, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }}
            />
          </label>
          {form.formState.errors.price && <small>{form.formState.errors.price.message}</small>}
          <label>
            Stock
            <input
              className="no-spin"
              type="number"
              name="stock"
              min={0}
              max={1000}
              step={1}
              value={Number.isFinite(values.stock) ? values.stock : ''}
              onChange={(event) => {
                const raw = event.target.value;
                if (raw === '') {
                  form.setValue('stock', Number.NaN, { shouldValidate: true, shouldDirty: true });
                  return;
                }
                const next = Number(raw);
                form.setValue('stock', Number.isFinite(next) ? Math.min(1000, next) : Number.NaN, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }}
            />
          </label>
          {form.formState.errors.stock && <small>{form.formState.errors.stock.message}</small>}
        </div>
        <label>
          Imagen
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => onImage(event.target.files?.[0])}
          />
        </label>
        {imageError && <small>{imageError}</small>}
        {preview ? (
          <img className="cover cover-md" src={preview} alt="Vista previa de la portada" />
        ) : (
          editing && book.data && <Cover title={book.data.title} imageUrl={book.data.imageUrl} />
        )}
        <div className="actions">
          <button className="btn btn-primary" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : 'Guardar'}
          </button>
          <Link className="btn btn-ghost" to={editing ? `/libros/${id}` : '/libros'}>
            Cancelar
          </Link>
        </div>
      </form>
    </section>
  );
}
