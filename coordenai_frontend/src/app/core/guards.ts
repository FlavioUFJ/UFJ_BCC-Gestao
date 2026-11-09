import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/** Exige usuário autenticado; caso contrário leva ao login e guarda o destino. */
export const autenticadoGuard: CanActivateFn = (_rota, estado) => {
  const auth = inject(AuthService);
  if (auth.autenticado()) {
    return true;
  }
  return inject(Router).createUrlTree(['/login'], { queryParams: { voltar: estado.url } });
};

/** Telas de visitante (login, recuperar senha): quem já entrou vai para o início. */
export const visitanteGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.autenticado() ? inject(Router).createUrlTree(['/']) : true;
};

/** Exige nível de acesso Administrador. A API confere de novo em cada chamada. */
export const administradorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.administrador() ? true : inject(Router).createUrlTree(['/']);
};
