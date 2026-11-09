import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/**
 * Campo de senha com botão de mostrar/ocultar.
 * `erros` associa cada validação à mensagem exibida, na ordem de prioridade.
 */
@Component({
  selector: 'app-campo-senha',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <mat-form-field appearance="outline">
      <mat-label>{{ rotulo() }}</mat-label>
      <input
        matInput
        [type]="visivel() ? 'text' : 'password'"
        [formControl]="controle()"
        [autocomplete]="autocomplete()"
      />
      <button
        matIconButton
        matSuffix
        type="button"
        [attr.aria-label]="visivel() ? 'Ocultar senha' : 'Mostrar senha'"
        [attr.aria-pressed]="visivel()"
        (click)="visivel.set(!visivel())"
      >
        <i [class]="visivel() ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'" aria-hidden="true"></i>
      </button>
      @if (dica(); as texto) {
        <mat-hint>{{ texto }}</mat-hint>
      }
      @if (mensagemErro(); as mensagem) {
        <mat-error>{{ mensagem }}</mat-error>
      }
    </mat-form-field>
  `,
  styles: `
    :host,
    mat-form-field {
      display: block;
      width: 100%;
    }

    button i {
      font-size: 1rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampoSenha {
  readonly controle = input.required<FormControl<string>>();
  readonly rotulo = input('Senha');
  readonly autocomplete = input('current-password');
  readonly dica = input<string | null>(null);
  readonly erros = input<Record<string, string>>({});

  protected readonly visivel = signal(false);

  /** Incrementado a cada mudança de estado do controle (valor, erros, tocado). */
  private readonly mudancas = signal(0);

  constructor() {
    // O estado de um FormControl não é um signal: acompanha os eventos dele
    // para que a mensagem de erro seja reavaliada.
    effect((aoLimpar) => {
      const inscricao = this.controle().events.subscribe(() => this.mudancas.update((n) => n + 1));
      aoLimpar(() => inscricao.unsubscribe());
    });
  }

  protected readonly mensagemErro = computed(() => {
    this.mudancas();
    const errosDoControle = this.controle().errors;
    if (!errosDoControle) {
      return null;
    }
    for (const [validacao, mensagem] of Object.entries(this.erros())) {
      if (errosDoControle[validacao]) {
        return mensagem;
      }
    }
    return null;
  });
}
