import { NamedRef } from '../types';
import { request } from './apiClient';

export async function listAuthors(): Promise<NamedRef[]> {
  const json = await request<{ data: NamedRef[] }>('/authors');
  return json.data;
}

export async function listPublishers(): Promise<NamedRef[]> {
  const json = await request<{ data: NamedRef[] }>('/publishers');
  return json.data;
}

export async function listGenres(): Promise<NamedRef[]> {
  const json = await request<{ data: NamedRef[] }>('/genres');
  return json.data;
}
