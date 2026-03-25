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

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    const value = this.token();
    if (!value.trim()) {
      this.error.set('Por favor, insira o token de acesso.');
      return;
    }

    if (this.auth.login(value)) {
      this.router.navigate(['/dashboard']);
    } else {
      this.error.set('Token inválido. Verifique e tente novamente.');
    }
  }
}
