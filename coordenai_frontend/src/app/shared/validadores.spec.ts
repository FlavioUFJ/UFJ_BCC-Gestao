import { FormControl, FormGroup, Validators } from '@angular/forms';

import { senhasIguais } from './validadores';

describe('senhasIguais', () => {
  function formulario() {
    return new FormGroup(
      {
        senha: new FormControl('', { nonNullable: true }),
        confirmar: new FormControl('', { nonNullable: true, validators: Validators.required }),
      },
      { validators: senhasIguais('senha', 'confirmar') },
    );
  }

  it('marca o campo de confirmação quando as senhas diferem', () => {
    const form = formulario();
    form.setValue({ senha: 'abc123', confirmar: 'abc124' });
    expect(form.controls.confirmar.hasError('diferente')).toBe(true);
    expect(form.valid).toBe(false);
  });

  it('limpa o erro quando passam a coincidir', () => {
    const form = formulario();
    form.setValue({ senha: 'abc123', confirmar: 'abc124' });
    form.controls.confirmar.setValue('abc123');
    expect(form.controls.confirmar.errors).toBeNull();
    expect(form.valid).toBe(true);
  });

  it('mantém o erro de campo obrigatório da confirmação', () => {
    const form = formulario();
    form.setValue({ senha: 'abc123', confirmar: '' });
    expect(form.controls.confirmar.hasError('required')).toBe(true);
    expect(form.controls.confirmar.hasError('diferente')).toBe(false);
  });
});
