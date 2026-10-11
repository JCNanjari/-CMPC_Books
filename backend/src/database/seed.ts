import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const GENRES = [
  'Novela',
  'Cuento',
  'Poesía',
  'Ensayo',
  'Infantil',
  'Juvenil',
  'Historia',
  'Ciencias',
  'Biografía',
  'Arte',
  'Educación',
  'Fantasía',
];

const BOOKS: Array<{
  title: string;
  author: string;
  publisher: string;
  genres: string[];
  price: number;
  stock: number;
}> = [
  { title: 'Cien años de soledad', author: 'Gabriel García Márquez', publisher: 'Alfaguara', genres: ['Novela'], price: 18990, stock: 12 },
  { title: 'El amor en los tiempos del cólera', author: 'Gabriel García Márquez', publisher: 'Alfaguara', genres: ['Novela'], price: 16990, stock: 7 },
  { title: 'Crónica de una muerte anunciada', author: 'Gabriel García Márquez', publisher: 'Alfaguara', genres: ['Novela'], price: 11990, stock: 10 },
  { title: 'Pedro Páramo', author: 'Juan Rulfo', publisher: 'Anagrama', genres: ['Novela'], price: 11990, stock: 4 },
  { title: 'Ficciones', author: 'Jorge Luis Borges', publisher: 'Penguin Random House', genres: ['Cuento'], price: 14990, stock: 9 },
  { title: 'La ciudad y los perros', author: 'Mario Vargas Llosa', publisher: 'Alfaguara', genres: ['Novela'], price: 15990, stock: 6 },
  { title: 'Veinte poemas de amor y una canción desesperada', author: 'Pablo Neruda', publisher: 'Zig-Zag', genres: ['Poesía'], price: 9990, stock: 20 },
  { title: 'Poema de Chile', author: 'Gabriela Mistral', publisher: 'Zig-Zag', genres: ['Poesía'], price: 12990, stock: 8 },
  { title: 'Altazor', author: 'Vicente Huidobro', publisher: 'Editorial Universitaria', genres: ['Poesía'], price: 12990, stock: 5 },
  { title: 'Subterra', author: 'Baldomero Lillo', publisher: 'Zig-Zag', genres: ['Cuento'], price: 10990, stock: 8 },
  { title: 'Hijo de ladrón', author: 'Manuel Rojas', publisher: 'Zig-Zag', genres: ['Novela'], price: 13990, stock: 3 },
  { title: 'La casa de los espíritus', author: 'Isabel Allende', publisher: 'Planeta', genres: ['Novela'], price: 17990, stock: 15 },
  { title: 'Papelucho', author: 'Marcela Paz', publisher: 'SM', genres: ['Infantil'], price: 8990, stock: 25 },
  { title: 'El principito', author: 'Antoine de Saint-Exupéry', publisher: 'Planeta', genres: ['Infantil', 'Fantasía'], price: 9990, stock: 30 },
  { title: '1984', author: 'George Orwell', publisher: 'Penguin Random House', genres: ['Novela'], price: 11990, stock: 18 },
  { title: 'Rayuela', author: 'Julio Cortázar', publisher: 'Alfaguara', genres: ['Novela'], price: 19990, stock: 6 },
  { title: 'Ensayo sobre la ceguera', author: 'José Saramago', publisher: 'Alfaguara', genres: ['Novela'], price: 16990, stock: 0 },
  { title: 'Historia de Chile', author: 'Sergio Villalobos', publisher: 'Editorial Universitaria', genres: ['Historia'], price: 24990, stock: 4 },
  { title: 'Steve Jobs', author: 'Walter Isaacson', publisher: 'Penguin Random House', genres: ['Biografía'], price: 21990, stock: 2 },
  { title: 'Cosmos', author: 'Carl Sagan', publisher: 'Planeta', genres: ['Ciencias'], price: 18990, stock: 7 },
  { title: 'El hobbit', author: 'J. R. R. Tolkien', publisher: 'Planeta', genres: ['Fantasía', 'Juvenil'], price: 15990, stock: 14 },
  { title: 'Pedagogía del oprimido', author: 'Paulo Freire', publisher: 'LOM', genres: ['Educación', 'Ensayo'], price: 13990, stock: 9 },
  { title: 'La historia del arte', author: 'E. H. Gombrich', publisher: 'Planeta', genres: ['Arte'], price: 27990, stock: 3 },
  { title: 'La amortajada', author: 'María Luisa Bombal', publisher: 'Editorial Universitaria', genres: ['Novela'], price: 10990, stock: 0 },
  { title: '2666', author: 'Roberto Bolaño', publisher: 'Anagrama', genres: ['Novela'], price: 22990, stock: 3 },
  { title: 'Coronación', author: 'José Donoso', publisher: 'Alfaguara', genres: ['Novela'], price: 14990, stock: 1 },
  { title: 'El arte de la guerra', author: 'Sun Tzu', publisher: 'Planeta', genres: ['Ensayo'], price: 7990, stock: 22 },
  { title: 'El obsceno pájaro de la noche', author: 'José Donoso', publisher: 'Alfaguara', genres: ['Novela'], price: 16990, stock: 5 },
];

const ADMIN_EMAIL = 'admin@cmpc-libros.cl';
const ADMIN_PASSWORD = 'Admin123!';

async function main() {
  const prisma = new PrismaClient();
  try {
    const password = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {},
      create: { email: ADMIN_EMAIL, password, name: 'Administrador CMPC' },
    });

    for (const name of GENRES) {
      await prisma.genre.upsert({ where: { name }, update: {}, create: { name } });
    }

    const existing = await prisma.book.count();
    if (existing > 0) {
      console.log(`Seed omitido: ya hay ${existing} libros.`);
      return;
    }

    for (const item of BOOKS) {
      const author = await prisma.author.upsert({
        where: { name: item.author },
        update: {},
        create: { name: item.author },
      });
      const publisher = await prisma.publisher.upsert({
        where: { name: item.publisher },
        update: {},
        create: { name: item.publisher },
      });
      const genreIds: string[] = [];
      for (const name of item.genres) {
        const genre = await prisma.genre.upsert({ where: { name }, update: {}, create: { name } });
        genreIds.push(genre.id);
      }
      await prisma.book.create({
        data: {
          title: item.title,
          price: new Prisma.Decimal(item.price),
          stock: item.stock,
          authorId: author.id,
          publisherId: publisher.id,
          genres: { create: genreIds.map((genreId) => ({ genreId })) },
        },
      });
    }

    console.log(`Seed listo: ${BOOKS.length} libros. Usuario ${ADMIN_EMAIL}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
