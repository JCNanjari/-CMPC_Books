import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { AuditPage } from './pages/AuditPage';
import { BookDetailPage } from './pages/BookDetailPage';
import { BookFormPage } from './pages/BookFormPage';
import { BooksPage } from './pages/BooksPage';
import { LoginPage } from './pages/LoginPage';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
    },
  });
}

export function App() {
  const [client] = useState(createQueryClient);
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/libros" replace />} />
                <Route path="/libros" element={<BooksPage />} />
                <Route path="/libros/nuevo" element={<BookFormPage />} />
                <Route path="/libros/:id" element={<BookDetailPage />} />
                <Route path="/libros/:id/editar" element={<BookFormPage />} />
                <Route path="/auditoria" element={<AuditPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/libros" replace />} />
          </Routes>
        </ErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  );
}
