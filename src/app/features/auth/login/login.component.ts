import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  nombreUsuario = '';
  password = '';
  readonly error = signal<string | null>(null);
  readonly cargando = signal(false);

  onSubmit(): void {
    this.error.set(null);
    this.cargando.set(true);

    this.auth.login(this.nombreUsuario, this.password).subscribe({
      next: () => {
        this.cargando.set(false);
        this.router.navigate(['/tablero']);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err?.error?.error?.message ?? 'Error al iniciar sesion');
      },
    });
  }
}
