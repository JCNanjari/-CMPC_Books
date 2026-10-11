process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://cmpc:cmpc_libros@localhost:5432/cmpc_libros?schema=public';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.JWT_EXPIRES_IN = '8h';
