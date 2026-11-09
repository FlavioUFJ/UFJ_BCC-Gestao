import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { AuthService } from '../../core/auth.service';
import { mensagemDeErro } from '../../core/erros';
import { CampoSenha } from '../../shared/campo-senha/campo-senha';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    CampoSenha,
  ],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', Validators.required],
    lembrar: [false],
  });

  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(
    this.rota.snapshot.queryParamMap.get('motivo') === 'sessao'
      ? 'Sua sessão terminou. Entre novamente para continuar.'
      : null,
  );

  protected entrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, senha, lembrar } = this.form.getRawValue();
    this.enviando.set(true);
    this.erro.set(null);
    this.aviso.set(null);

    this.auth.login(email.trim(), senha, lembrar).subscribe({
      next: () => void this.router.navigateByUrl(this.destino()),
      error: (erro: unknown) => {
        this.enviando.set(false);
        this.erro.set(mensagemDeErro(erro, 'Não foi possível entrar. Tente novamente.'));
      },
    });
  }

  /** Só aceita voltar para um caminho interno da aplicação. */
  private destino(): string {
    const voltar = this.rota.snapshot.queryParamMap.get('voltar');
    return voltar && voltar.startsWith('/') && !voltar.startsWith('//') ? voltar : '/';
  }
}
