import { saveBlob } from '../lib/download';
import { toSearchParams } from '../lib/query';
import { Book, BookQuery, Paginated } from '../types';
import { request } from './apiClient';

export async function listBooks(params: BookQuery): Promise<Paginated<Book>> {
  const json = await request<Paginated<Book>>(`/books?${toSearchParams(params)}`);
  return { data: json.data, meta: json.meta };
}

export async function getBook(id: string): Promise<Book> {
  const json = await request<{ data: Book }>(`/books/${id}`);
  return json.data;
}

export async function createBook(body: FormData): Promise<Book> {
  const json = await request<{ data: Book }>('/books', { method: 'POST', body });
  return json.data;
}

export async function updateBook(id: string, body: FormData): Promise<Book> {
  const json = await request<{ data: Book }>(`/books/${id}`, { method: 'PATCH', body });
  return json.data;
}

export async function removeBook(id: string): Promise<{ id: string; deleted: boolean }> {
  const json = await request<{ data: { id: string; deleted: boolean } }>(`/books/${id}`, {
    method: 'DELETE',
  });
  return json.data;
}

export async function downloadBooksExcel(params: BookQuery): Promise<void> {
  const blob = await request<Blob>(`/books/export?${toSearchParams(params)}`, { asBlob: true });
  const date = new Date().toISOString().slice(0, 10);
  saveBlob(blob, `libros-${date}.xlsx`);
}
