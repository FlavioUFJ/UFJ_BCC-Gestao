import { HttpErrorResponse } from '@angular/common/http';

import { mensagemDeErro } from './erros';

describe('mensagemDeErro', () => {
  it('usa a mensagem devolvida pela API', () => {
    const erro = new HttpErrorResponse({ status: 400, error: { success: false, message: 'Senha atual incorreta' } });
    expect(mensagemDeErro(erro)).toBe('Senha atual incorreta');
  });

  it('informa falha de conexão quando não há resposta', () => {
    expect(mensagemDeErro(new HttpErrorResponse({ status: 0 }))).toContain('Sem conexão');
  });

  it('usa a mensagem padrão quando a resposta não traz texto', () => {
    const erro = new HttpErrorResponse({ status: 500, error: '<html>erro</html>' });
    expect(mensagemDeErro(erro, 'Falhou')).toBe('Falhou');
    expect(mensagemDeErro(undefined, 'Falhou')).toBe('Falhou');
  });
});
