import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

import { AuthService } from '../../core/auth.service';
import { mensagemDeErro } from '../../core/erros';
import { NotificacaoService } from '../../core/notificacao.service';
import { CampoSenha } from '../../shared/campo-senha/campo-senha';
import { TAMANHO_MINIMO_SENHA, senhasIguais } from '../../shared/validadores';

@Component({
  selector: 'app-alterar-senha',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, CampoSenha],
  template: `
    <section class="pagina-estreita">
      <h1 class="titulo-pagina">Alterar senha</h1>
      <p class="subtitulo-pagina">Confirme a senha atual e escolha a nova.</p>

      @if (erro(); as mensagem) {
        <p class="aviso aviso-falha" role="alert">{{ mensagem }}</p>
      }

      <form class="formulario-coluna" [formGroup]="form" (ngSubmit)="salvar()" novalidate>
        <app-campo-senha
          rotulo="Senha atual"
          [controle]="form.controls.senhaAtual"
          [erros]="{ required: 'Informe a senha atual.' }"
        />
        <app-campo-senha
          rotulo="Nova senha"
          autocomplete="new-password"
          [dica]="'Mínimo de ' + minimo + ' caracteres.'"
          [controle]="form.controls.novaSenha"
          [erros]="{
            required: 'Informe a nova senha.',
            minlength: 'A senha deve ter pelo menos ' + minimo + ' caracteres.',
          }"
        />
        <app-campo-senha
          rotulo="Confirmar nova senha"
          autocomplete="new-password"
          [controle]="form.controls.confirmarNovaSenha"
          [erros]="{ required: 'Repita a nova senha.', diferente: 'As senhas não coincidem.' }"
        />

        <div class="linha-botoes">
          <a matButton routerLink="/">Cancelar</a>
          <button matButton="filled" type="submit" [disabled]="enviando()">
            {{ enviando() ? 'Salvando…' : 'Salvar nova senha' }}
          </button>
        </div>
      </form>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlterarSenha {
  private readonly auth = inject(AuthService);
  private readonly notificacao = inject(NotificacaoService);
  private readonly formulario = viewChild.required(FormGroupDirective);

  protected readonly minimo = TAMANHO_MINIMO_SENHA;

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      senhaAtual: ['', Validators.required],
      novaSenha: ['', [Validators.required, Validators.minLength(TAMANHO_MINIMO_SENHA)]],
      confirmarNovaSenha: ['', Validators.required],
    },
    { validators: senhasIguais('novaSenha', 'confirmarNovaSenha') },
  );

  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { senhaAtual, novaSenha, confirmarNovaSenha } = this.form.getRawValue();
    this.enviando.set(true);
    this.erro.set(null);

    this.auth.alterarSenha(senhaAtual, novaSenha, confirmarNovaSenha).subscribe({
      next: (resposta) => {
        this.enviando.set(false);
        this.formulario().resetForm();
        this.notificacao.sucesso(resposta.message ?? 'Senha alterada com sucesso.');
      },
      error: (erro: unknown) => {
        this.enviando.set(false);
        this.erro.set(mensagemDeErro(erro, 'Não foi possível alterar a senha. Tente novamente.'));
      },
    });
  }
}
