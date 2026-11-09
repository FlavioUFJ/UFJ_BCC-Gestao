import { environment } from '../../environments/environment';

/**
 * Convivência com o sistema legado.
 *
 * As telas ainda não migradas continuam no legado. Como os dois sistemas
 * compartilham a sessão, o usuário passa de um para o outro sem novo login.
 *
 * Ao migrar uma tela, registre aqui o caminho do legado e a rota Angular que
 * o substitui: os links passam a apontar para a nova tela automaticamente.
 */
const ROTAS_MIGRADAS: Record<string, string> = {
  '/': '/',
  '/dashboard': '/',
  '/alterar-senha': '/alterar-senha',
};

export interface Destino {
  /** Rota interna do Angular, quando a tela já foi migrada. */
  rota?: string;
  /** Endereço no legado, quando ainda não foi. */
  href?: string;
}

export function destinoDe(caminhoLegado: string | null | undefined): Destino {
  if (!caminhoLegado) {
    return {};
  }
  const caminho = caminhoLegado.split('?')[0];
  const rota = ROTAS_MIGRADAS[caminho];
  if (rota) {
    return { rota };
  }
  return { href: `${environment.legadoUrl}${caminhoLegado}` };
}
