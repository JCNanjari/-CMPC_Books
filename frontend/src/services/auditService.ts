import { AuditEntry, Paginated } from '../types';
import { request } from './apiClient';

export async function listAudit(page = 1): Promise<Paginated<AuditEntry>> {
  const json = await request<Paginated<AuditEntry>>(`/audit?page=${page}&limit=20`);
  return { data: json.data, meta: json.meta };
}
