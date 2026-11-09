import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AuthService } from '../../core/auth.service';
import { mensagemDeErro } from '../../core/erros';
import { NotificacaoService } from '../../core/notificacao.service';
import { CampoSenha } from '../../shared/campo-senha/campo-senha';
import { TAMANHO_MINIMO_SENHA, senhasIguais } from '../../shared/validadores';

type Situacao = 'verificando' | 'valido' | 'invalido';

@Component({
  selector: 'app-redefinir-senha',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatProgressBarModule, CampoSenha],
  template: `
    <h1 class="titulo-pagina">Redefinir senha</h1>

    @switch (situacao()) {
      @case ('verificando') {
        <p class="subtitulo-pagina">Verificando o link…</p>
        <mat-progress-bar mode="indeterminate" aria-label="Verificando o link" />
      }
      @case ('invalido') {
        <p class="aviso aviso-falha" role="alert">
          Este link é inválido ou expirou. Solicite uma nova recuperação de senha.
        </p>
        <a matButton="filled" class="botao-principal" routerLink="/recuperar-senha">Solicitar novo link</a>
      }
      @case ('valido') {
        <p class="subtitulo-pagina">Escolha a nova senha de acesso.</p>

        @if (erro(); as mensagem) {
          <p class="aviso aviso-falha" role="alert">{{ mensagem }}</p>
        }

        <form class="formulario-coluna" [formGroup]="form" (ngSubmit)="salvar()" novalidate>
          <app-campo-senha
            rotulo="Nova senha"
            autocomplete="new-password"
            [dica]="'Mínimo de ' + minimo + ' caracteres.'"
            [controle]="form.controls.senha"
            [erros]="{
              required: 'Informe a nova senha.',
              minlength: 'A senha deve ter pelo menos ' + minimo + ' caracteres.',
            }"
          />
          <app-campo-senha
            rotulo="Confirmar nova senha"
            autocomplete="new-password"
            [controle]="form.controls.confirmarSenha"
            [erros]="{ required: 'Repita a nova senha.', diferente: 'As senhas não coincidem.' }"
          />

          <button matButton="filled" class="botao-principal" type="submit" [disabled]="enviando()">
            {{ enviando() ? 'Salvando…' : 'Salvar nova senha' }}
          </button>
        </form>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RedefinirSenha implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificacao = inject(NotificacaoService);
  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';

  protected readonly minimo = TAMANHO_MINIMO_SENHA;

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      senha: ['', [Validators.required, Validators.minLength(TAMANHO_MINIMO_SENHA)]],
      confirmarSenha: ['', Validators.required],
    },
    { validators: senhasIguais('senha', 'confirmarSenha') },
  );

  protected readonly situacao = signal<Situacao>('verificando');
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);

  ngOnInit(): void {
    this.auth
      .validarTokenRedefinicao(this.token)
      .subscribe((valido) => this.situacao.set(valido ? 'valido' : 'invalido'));
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { senha, confirmarSenha } = this.form.getRawValue();
    this.enviando.set(true);
    this.erro.set(null);

    this.auth.redefinirSenha(this.token, senha, confirmarSenha).subscribe({
      next: () => {
        this.notificacao.sucesso('Senha redefinida. Entre com a nova senha.');
        void this.router.navigate(['/login']);
      },
      error: (erro: unknown) => {
        this.enviando.set(false);
        this.erro.set(mensagemDeErro(erro, 'Não foi possível redefinir a senha. Tente novamente.'));
      },
    });
  }
}
