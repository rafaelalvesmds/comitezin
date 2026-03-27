import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'comitezin_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  readonly isAuthenticated = signal(false);
  readonly deviceId = signal<string>('');
  readonly token = signal<string | null>(null);

  constructor() {
    // Check if we have a token stored from a previous session
    const storedAuth = sessionStorage.getItem(STORAGE_KEY);
    if (storedAuth) {
      this.isAuthenticated.set(true);
      this.token.set(storedAuth);
    }

    // Device Tracking (persists even if not "logged in")
    let dId = localStorage.getItem('comitezin_device_id');
    if (!dId) {
      try {
        dId = crypto.randomUUID();
        localStorage.setItem('comitezin_device_id', dId);
      } catch (e) {
        dId = 'anonymous-' + Math.random().toString(36).substring(2, 9);
      }
    }
    this.deviceId.set(dId || '');
  }

  /**
   * Tries to verify the token with the backend.
   * If successful, saves the session.
   */
  async login(token: string): Promise<{ success: boolean; error?: string }> {
    const trimmed = token.trim();
    if (!trimmed) return { success: false, error: 'Por favor, insira o token de acesso.' };

    try {
      // We call the verify endpoint with the provided token in the header
      await this.http.get(`${environment.apiUrl}/auth/verify`, {
        headers: { 'Authorization': trimmed }
      }).toPromise();

      // If we are here, the server returned 200 OK
      sessionStorage.setItem(STORAGE_KEY, trimmed);
      this.token.set(trimmed);
      this.isAuthenticated.set(true);
      return { success: true };
    } catch (err: any) {
      console.error('Falha na autenticação', err);
      // Clean up if it failed
      this.logout();
      if (err.status === 0) {
        return { success: false, error: 'Erro de conexão: O servidor backend não está respondendo.' };
      }
      if (err.status === 401) {
        return { success: false, error: 'Token inválido. Verifique e tente novamente.' };
      }
      return { success: false, error: 'Erro ao tentar autenticar. Verifique sua conexão.' };
    }
  }

  logout(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    this.isAuthenticated.set(false);
    this.token.set(null);
  }
}
