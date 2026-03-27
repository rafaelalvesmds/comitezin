import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  token = signal('');
  error = signal('');
  isLoading = signal(false);

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  async onSubmit(): Promise<void> {
    const value = this.token();
    if (!value.trim()) {
      this.error.set('Por favor, insira o token de acesso.');
      return;
    }

    this.isLoading.set(true);
    this.error.set('');

    try {
      const success = await this.auth.login(value);
      if (success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.error.set('Token inválido. Verifique e tente novamente.');
      }
    } catch (err) {
      this.error.set('Erro ao tentar autenticar. Verifique sua conexão.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
