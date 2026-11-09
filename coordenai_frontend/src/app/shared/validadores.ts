import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Tamanho mínimo de senha aceito pela API. */
export const TAMANHO_MINIMO_SENHA = 6;

/**
 * Validador de formulário: o campo de confirmação deve repetir a senha.
 * O erro `diferente` é marcado no campo de confirmação.
 */
export function senhasIguais(campoSenha: string, campoConfirmacao: string): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const senha = grupo.get(campoSenha);
    const confirmacao = grupo.get(campoConfirmacao);
    if (!senha || !confirmacao) {
      return null;
    }

    const diferente = !!confirmacao.value && senha.value !== confirmacao.value;
    const outros = { ...(confirmacao.errors ?? {}) };
    delete outros['diferente'];

    if (diferente) {
      confirmacao.setErrors({ ...outros, diferente: true });
    } else {
      confirmacao.setErrors(Object.keys(outros).length ? outros : null);
    }
    return null;
  };
}
