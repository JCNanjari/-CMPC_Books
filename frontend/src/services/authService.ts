import { LoginResponse } from '../types';
import { request } from './apiClient';

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const json = await request<{ data: LoginResponse }>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    skipAuthRedirect: true,
  });
  return json.data;
}
