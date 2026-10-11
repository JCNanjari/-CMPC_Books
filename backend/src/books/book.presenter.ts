import { BookWithRelations } from './book.query';

export interface BookView {
  id: string;
  title: string;
  price: number;
  stock: number;
  available: boolean;
  imageUrl: string | null;
  author: { id: string; name: string };
  publisher: { id: string; name: string };
  genres: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
}

function money(price: { toString(): string } | number): number {
  const numeric = typeof price === 'number' ? price : Number(price.toString());
  return Number(numeric.toFixed(2));
}

export function presentBook(book: BookWithRelations): BookView {
  return {
    id: book.id,
    title: book.title,
    price: money(book.price),
    stock: book.stock,
    available: book.stock > 0,
    imageUrl: book.imageUrl,
    author: { id: book.author.id, name: book.author.name },
    publisher: { id: book.publisher.id, name: book.publisher.name },
    genres: book.genres.map((item) => ({ id: item.genre.id, name: item.genre.name })),
    createdAt: book.createdAt.toISOString(),
    updatedAt: book.updatedAt.toISOString(),
  };
}
