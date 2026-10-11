import { cleanup, render, screen } from '@testing-library/react';
import { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { useAuth } from '../auth/AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { loginRequest } from '../services/authService';
import { renderApp } from '../test/render';

vi.mock('../services/authService', () => ({ loginRequest: vi.fn() }));

describe('sesión', () => {
  it('valida, muestra el error del servidor y entra', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Ingrese un correo válido')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Correo'), 'admin@cmpc-libros.cl');
    await user.type(screen.getByLabelText('Contraseña'), 'Admin123!');
    vi.mocked(loginRequest).mockRejectedValueOnce('fallo');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('No se pudo iniciar sesión')).toBeInTheDocument();

    vi.mocked(loginRequest).mockRejectedValueOnce(new Error('Credenciales inválidas'));
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument();

    vi.mocked(loginRequest).mockResolvedValueOnce({
      accessToken: 'token',
      expiresIn: '8h',
      user: { id: 'u', email: 'admin@cmpc-libros.cl', name: 'Administrador CMPC' },
    });
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('heading', { name: 'Libros' })).toBeInTheDocument();
  });

  it('manda al inventario si ya hay sesión y sale de ella', async () => {
    localStorage.setItem('token', 'token');
    localStorage.setItem('user', 'no-es-json');
    renderApp('/libros');
    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeInTheDocument();

    cleanup();
    localStorage.setItem('token', 'token');
    localStorage.setItem('user', JSON.stringify({ id: 'u', email: 'a@b.c', name: 'Ada' }));
    renderApp('/login');
    expect(await screen.findByRole('heading', { name: 'Libros' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Salir' }));
    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeInTheDocument();
  });

  it('exige el proveedor de autenticación', () => {
    function Probe() {
      useAuth();
      return null;
    }
    expect(() => renderApp()).not.toThrow();
    expect(() => render(<Probe />)).toThrow('useAuth debe usarse dentro de AuthProvider');
  });
});

describe('ErrorBoundary', () => {
  it('muestra el fallo y permite reintentar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    function Boom(): ReactElement {
      throw new Error('boom');
    }
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Algo salió mal');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
