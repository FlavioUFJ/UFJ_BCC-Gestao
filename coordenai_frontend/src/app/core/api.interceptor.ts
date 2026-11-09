import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/** Rotas em que um 401 é resposta esperada e não significa sessão expirada. */
const SEM_REDIRECIONAR = ['/auth/login', '/session-status'];

/**
 * Interceptador das chamadas à API:
 *  - envia o cookie de sessão;
 *  - quando a API responde 401, limpa o usuário local e leva ao login,
 *    guardando o endereço para voltar depois.
 *
 * O token CSRF (cookie XSRF-TOKEN -> cabeçalho X-XSRF-TOKEN) é tratado pelo
 * próprio HttpClient do Angular.
 */
export const apiInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  if (!requisicao.url.startsWith(environment.apiUrl)) {
    return proximo(requisicao);
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  return proximo(requisicao.clone({ withCredentials: true })).pipe(
    catchError((erro: unknown) => {
      const ignorar = SEM_REDIRECIONAR.some((rota) => requisicao.url.endsWith(rota));

      if (erro instanceof HttpErrorResponse && erro.status === 401 && !ignorar) {
        auth.sessaoExpirou();
        const atual = router.url;
        if (!atual.startsWith('/login')) {
          void router.navigate(['/login'], { queryParams: { voltar: atual, motivo: 'sessao' } });
        }
      }
      return throwError(() => erro);
    }),
  );
};
