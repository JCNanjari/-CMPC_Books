import { z } from 'zod';
import { Book } from '../types';

export const bookSchema = z
  .object({
    title: z.string().trim().min(1, 'El título es obligatorio').max(200, 'El título es demasiado largo'),
    authorMode: z.enum(['existing', 'new']),
    authorId: z.string(),
    authorName: z.string(),
    publisherMode: z.enum(['existing', 'new']),
    publisherId: z.string(),
    publisherName: z.string(),
    genreIds: z.array(z.string()),
    genreNames: z.array(z.string()),
    price: z
      .number({ invalid_type_error: 'El precio es obligatorio' })
      .min(0, 'El precio no puede ser negativo')
      .max(99999999.99, 'El precio es demasiado alto'),
    stock: z
      .number({ invalid_type_error: 'El stock es obligatorio' })
      .int('El stock debe ser un número entero')
      .min(0, 'El stock no puede ser negativo')
      .max(1000, 'El stock no puede superar 1.000'),
  })
  .superRefine((values, ctx) => {
    if (values.authorMode === 'existing' && !values.authorId) {
      ctx.addIssue({ code: 'custom', path: ['authorId'], message: 'Seleccione un autor' });
    }
    if (values.authorMode === 'new' && values.authorName.trim().length === 0) {
      ctx.addIssue({ code: 'custom', path: ['authorName'], message: 'Indique el nombre del autor' });
    }
    if (values.authorMode === 'new' && values.authorName.trim().length > 120) {
      ctx.addIssue({ code: 'custom', path: ['authorName'], message: 'El nombre del autor es demasiado largo' });
    }
    if (values.publisherMode === 'existing' && !values.publisherId) {
      ctx.addIssue({ code: 'custom', path: ['publisherId'], message: 'Seleccione una editorial' });
    }
    if (values.publisherMode === 'new' && values.publisherName.trim().length === 0) {
      ctx.addIssue({ code: 'custom', path: ['publisherName'], message: 'Indique el nombre de la editorial' });
    }
    if (values.publisherMode === 'new' && values.publisherName.trim().length > 120) {
      ctx.addIssue({
        code: 'custom',
        path: ['publisherName'],
        message: 'El nombre de la editorial es demasiado largo',
      });
    }
    if (values.genreIds.length + values.genreNames.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['genreIds'], message: 'Seleccione al menos un género' });
    }
  });

export type BookFormValues = z.infer<typeof bookSchema>;

export const emptyBookForm: BookFormValues = {
  title: '',
  authorMode: 'new',
  authorId: '',
  authorName: '',
  publisherMode: 'new',
  publisherId: '',
  publisherName: '',
  genreIds: [],
  genreNames: [],
  price: Number.NaN,
  stock: Number.NaN,
};

export interface BookPayload {
  title: string;
  price: number;
  stock: number;
  authorId?: string;
  authorName?: string;
  publisherId?: string;
  publisherName?: string;
  genreIds: string[];
  genreNames: string[];
}

export function toBookPayload(values: BookFormValues): BookPayload {
  return {
    title: values.title.trim(),
    price: values.price,
    stock: values.stock,
    ...(values.authorMode === 'existing'
      ? { authorId: values.authorId }
      : { authorName: values.authorName.trim() }),
    ...(values.publisherMode === 'existing'
      ? { publisherId: values.publisherId }
      : { publisherName: values.publisherName.trim() }),
    genreIds: values.genreIds,
    genreNames: values.genreNames,
  };
}

export function toFormData(payload: BookPayload, image?: File | null): FormData {
  const form = new FormData();
  form.append('title', payload.title);
  form.append('price', String(payload.price));
  form.append('stock', String(payload.stock));
  if (payload.authorId) form.append('authorId', payload.authorId);
  if (payload.authorName) form.append('authorName', payload.authorName);
  if (payload.publisherId) form.append('publisherId', payload.publisherId);
  if (payload.publisherName) form.append('publisherName', payload.publisherName);
  form.append('genreIds', JSON.stringify(payload.genreIds));
  form.append('genreNames', JSON.stringify(payload.genreNames));
  if (image) form.append('image', image);
  return form;
}

export function bookToForm(book: Book): BookFormValues {
  return {
    title: book.title,
    authorMode: 'existing',
    authorId: book.author.id,
    authorName: '',
    publisherMode: 'existing',
    publisherId: book.publisher.id,
    publisherName: '',
    genreIds: book.genres.map((genre) => genre.id),
    genreNames: [],
    price: book.price,
    stock: book.stock,
  };
}

export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

export function addGenreName(current: string[], raw: string): { names: string[]; error?: string } {
  const name = raw.trim();
  if (!name) return { names: current, error: 'Escriba un género' };
  if (name.length > 60) return { names: current, error: 'El género es demasiado largo' };
  if (current.some((item) => item.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'))) {
    return { names: current, error: 'Ese género ya está agregado' };
  }
  return { names: [...current, name] };
}

export const loginSchema = z.object({
  email: z.string().trim().email('Ingrese un correo válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export type LoginValues = z.infer<typeof loginSchema>;
