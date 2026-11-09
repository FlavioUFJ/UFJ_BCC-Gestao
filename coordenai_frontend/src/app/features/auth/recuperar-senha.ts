import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { AuthService } from '../../core/auth.service';
import { mensagemDeErro } from '../../core/erros';

@Component({
  selector: 'app-recuperar-senha',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h1 class="titulo-pagina">Recuperar senha</h1>

    @if (enviado(); as mensagem) {
      <p class="aviso aviso-ok" role="status">{{ mensagem }}</p>
      <p class="subtitulo-pagina">O link enviado vale por uma hora. Confira também a caixa de spam.</p>
      <a matButton="outlined" class="botao-principal" routerLink="/login">Voltar ao login</a>
    } @else {
      <p class="subtitulo-pagina">Informe seu e-mail para receber o link de redefinição.</p>

      @if (erro(); as mensagem) {
        <p class="aviso aviso-falha" role="alert">{{ mensagem }}</p>
      }

      <form class="formulario-coluna" [formGroup]="form" (ngSubmit)="enviar()" novalidate>
        <mat-form-field appearance="outline">
          <mat-label>E-mail</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="username" inputmode="email" />
          @if (form.controls.email.hasError('required')) {
            <mat-error>Informe seu e-mail.</mat-error>
          } @else if (form.controls.email.hasError('email')) {
            <mat-error>Informe um e-mail válido.</mat-error>
          }
        </mat-form-field>

        <button matButton="filled" class="botao-principal" type="submit" [disabled]="enviando()">
          {{ enviando() ? 'Enviando…' : 'Enviar link' }}
        </button>
        <a matButton class="botao-principal" routerLink="/login">Voltar ao login</a>
      </form>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecuperarSenha {
  private readonly auth = inject(AuthService);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly enviado = signal<string | null>(null);

  protected enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.erro.set(null);

    this.auth.solicitarRecuperacao(this.form.getRawValue().email.trim()).subscribe({
      next: (resposta) => {
        this.enviando.set(false);
        this.enviado.set(resposta.message ?? 'Se o e-mail estiver cadastrado, você receberá as instruções.');
      },
      error: (erro: unknown) => {
        this.enviando.set(false);
        this.erro.set(mensagemDeErro(erro, 'Não foi possível enviar a solicitação. Tente novamente.'));
      },
    });
  }
}
