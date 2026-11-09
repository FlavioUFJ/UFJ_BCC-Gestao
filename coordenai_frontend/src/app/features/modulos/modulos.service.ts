import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Modulo, RespostaApi } from '../../core/modelos';

export interface ModuloAdmin extends Modulo {
  quantidade_vinculos: number;
}

@Injectable({ providedIn: 'root' })
export class ModulosService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  /** Módulos do sistema, com a indicação de quais o usuário pode acessar. */
  doUsuario(): Observable<Modulo[]> {
    return this.http
      .get<RespostaApi<{ modulos?: Modulo[] }>>(`${this.api}/dashboard`)
      .pipe(map((resposta) => resposta.data?.modulos ?? []));
  }

  /** Todos os módulos, com a quantidade de pessoas vinculadas (somente administrador). */
  todos(): Observable<ModuloAdmin[]> {
    return this.http.get<ModuloAdmin[]>(`${this.api}/admin/modulos`);
  }
}
