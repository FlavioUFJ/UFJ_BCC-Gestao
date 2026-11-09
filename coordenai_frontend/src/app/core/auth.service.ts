import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { NIVEL_ADMINISTRADOR, RespostaApi, Usuario } from './modelos';

interface RespostaSessao {
  authenticated: boolean;
  user?: Usuario;
}

interface RespostaLogin extends RespostaApi {
  user?: Usuario;
}

/**
 * Estado de autenticação do frontend.
 *
 * A sessão vive no backend (cookie httpOnly). Aqui fica apenas uma cópia dos
 * dados do usuário, usada para montar a interface e decidir a navegação; a
 * autorização de fato é sempre conferida pela API.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  private readonly usuarioAtual = signal<Usuario | null>(null);

  readonly usuario = this.usuarioAtual.asReadonly();
  readonly autenticado = computed(() => this.usuarioAtual() !== null);
  readonly administrador = computed(() => this.usuarioAtual()?.nivelacesso === NIVEL_ADMINISTRADOR);

  /**
   * Consulta a sessão no backend. Chamado uma vez, antes de a aplicação
   * iniciar; também serve para o backend entregar o cookie do token CSRF.
   */
  carregarSessao(): Promise<void> {
    return firstValueFrom(
      this.http.get<RespostaSessao>(`${this.api}/session-status`).pipe(
        tap((resposta) => this.usuarioAtual.set(resposta.authenticated ? (resposta.user ?? null) : null)),
        map(() => undefined),
        catchError(() => {
          this.usuarioAtual.set(null);
          return of(undefined);
        }),
      ),
    );
  }

  login(email: string, senha: string, lembrar: boolean): Observable<Usuario> {
    return this.http
      .post<RespostaLogin>(`${this.api}/auth/login`, { email, senha, remember: lembrar })
      .pipe(
        map((resposta) => {
          if (!resposta.user) {
            throw new Error(resposta.message ?? 'Não foi possível entrar.');
          }
          this.usuarioAtual.set(resposta.user);
          return resposta.user;
        }),
      );
  }

  logout(): Observable<void> {
    return this.http.post<RespostaApi>(`${this.api}/logout`, {}).pipe(
      map(() => undefined),
      catchError(() => of(undefined)),
      tap(() => this.usuarioAtual.set(null)),
    );
  }

  /** Usado pelo interceptador quando a API responde 401. */
  sessaoExpirou(): void {
    this.usuarioAtual.set(null);
  }

  solicitarRecuperacao(email: string): Observable<RespostaApi> {
    return this.http.post<RespostaApi>(`${this.api}/auth/forgot-password`, { email });
  }

  validarTokenRedefinicao(token: string): Observable<boolean> {
    return this.http
      .get<RespostaApi & { valid?: boolean }>(`${this.api}/auth/reset-password/${encodeURIComponent(token)}`)
      .pipe(
        map((resposta) => resposta.valid === true),
        catchError(() => of(false)),
      );
  }

  redefinirSenha(token: string, senha: string, confirmarSenha: string): Observable<RespostaApi> {
    return this.http.post<RespostaApi>(`${this.api}/auth/reset-password/${encodeURIComponent(token)}`, {
      senha,
      confirmarSenha,
    });
  }

  alterarSenha(senhaAtual: string, novaSenha: string, confirmarNovaSenha: string): Observable<RespostaApi> {
    return this.http.post<RespostaApi>(`${this.api}/alterar-senha`, {
      senhaAtual,
      novaSenha,
      confirmarNovaSenha,
    });
  }
}
