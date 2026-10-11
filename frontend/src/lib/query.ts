import { BookQuery } from '../types';

export function toSearchParams(params: BookQuery): string {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.search) search.set('search', params.search);
  if (params.genreId) search.set('genreId', params.genreId);
  if (params.authorId) search.set('authorId', params.authorId);
  if (params.publisherId) search.set('publisherId', params.publisherId);
  if (params.available) search.set('available', params.available);
  if (params.sort) search.set('sort', params.sort);
  return search.toString();
}
