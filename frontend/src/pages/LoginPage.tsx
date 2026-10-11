import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ErrorBanner } from '../components/ErrorBanner';
import { LoginValues, loginSchema } from '../lib/bookForm';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), mode: 'onChange' });

  if (user) return <Navigate to="/libros" replace />;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
      navigate('/libros');
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'No se pudo iniciar sesión');
    }
  });

  return (
    <div className="login">
      <section className="login-story">
        <p className="eyebrow">CMPC Libros</p>
        <h1>El inventario de la librería, en orden.</h1>
        <p>Títulos, autores, editoriales y disponibilidad. Un solo lugar para consultar, editar y exportar.</p>
        <div className="spines" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </section>
      <section className="login-panel">
        <form className="card form" onSubmit={onSubmit} noValidate>
          <h2>Ingresar</h2>
          <ErrorBanner message={serverError} />
          <label>
            Correo
            <input type="email" autoComplete="username" {...register('email')} />
          </label>
          {errors.email && <small>{errors.email.message}</small>}
          <label>
            Contraseña
            <input type="password" autoComplete="current-password" {...register('password')} />
          </label>
          {errors.password && <small>{errors.password.message}</small>}
          <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Ingresando…' : 'Entrar'}
          </button>
          <p className="hint">
            Demostración: admin@cmpc-libros.cl · Admin123!
          </p>
        </form>
      </section>
    </div>
  );
}
