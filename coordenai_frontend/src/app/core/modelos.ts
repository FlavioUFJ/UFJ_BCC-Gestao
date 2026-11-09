/** Usuário autenticado, como devolvido por /api/session-status e /api/auth/login. */
export interface Usuario {
  id_pessoa: number;
  nome: string;
  email: string;
  nivelacesso: string;
  categoria?: string | number | null;
  /** Nomes dos módulos a que o usuário tem acesso. */
  permissoes: string[];
}

/** Envelope usado pela maior parte das respostas da API. */
export interface RespostaApi<T = unknown> {
  success: boolean;
  message?: string;
  code?: string;
  data?: T;
}

export interface Modulo {
  id_modulo: number;
  nome: string;
  descricao: string | null;
  icone: string | null;
  cor: string | null;
  url: string | null;
  ordem: number | null;
  ativo?: number | boolean;
  tem_acesso?: boolean;
}

export const NIVEL_ADMINISTRADOR = 'Administrador';
