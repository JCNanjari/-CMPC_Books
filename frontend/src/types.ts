export interface NamedRef {
  id: string;
  name: string;
}

export interface Book {
  id: string;
  title: string;
  price: number;
  stock: number;
  available: boolean;
  imageUrl: string | null;
  author: NamedRef;
  publisher: NamedRef;
  genres: NamedRef[];
  createdAt: string;
  updatedAt: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: string;
  user: SessionUser;
}

export interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  ip: string | null;
  metadata: unknown;
  createdAt: string;
  user: SessionUser | null;
}

export interface BookQuery {
  page?: number;
  limit?: number;
  search?: string;
  genreId?: string;
  authorId?: string;
  publisherId?: string;
  available?: '' | 'true' | 'false';
  sort?: string;
}
