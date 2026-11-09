import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extrai de um erro a mensagem a exibir ao usuário.
 * A API responde `{ success: false, message }`; para falhas de rede ou
 * respostas inesperadas é usada a mensagem padrão informada.
 */
export function mensagemDeErro(erro: unknown, padrao = 'Não foi possível concluir a operação.'): string {
  if (erro instanceof HttpErrorResponse) {
    if (erro.status === 0) {
      return 'Sem conexão com o servidor. Verifique sua rede e tente novamente.';
    }
    const corpo = erro.error as { message?: unknown; error?: unknown } | null;
    if (corpo && typeof corpo.message === 'string' && corpo.message.trim()) {
      return corpo.message;
    }
    if (corpo && typeof corpo.error === 'string' && corpo.error.trim()) {
      return corpo.error;
    }
    return padrao;
  }
  if (erro instanceof Error && erro.message) {
    return erro.message;
  }
  return padrao;
}
