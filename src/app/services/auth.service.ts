import { Injectable, signal } from '@angular/core';

const VALID_GUID = '123e4567-e89b-12d3-a456-426614174000';
const STORAGE_KEY = 'comitezin_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly isAuthenticated = signal(false);

  constructor() {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === VALID_GUID) {
      this.isAuthenticated.set(true);
    }
  }

  login(token: string): boolean {
    if (token.trim().toLowerCase() === VALID_GUID) {
      sessionStorage.setItem(STORAGE_KEY, VALID_GUID);
      this.isAuthenticated.set(true);
      return true;
    }
    return false;
  }

  logout(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    this.isAuthenticated.set(false);
  }
}
