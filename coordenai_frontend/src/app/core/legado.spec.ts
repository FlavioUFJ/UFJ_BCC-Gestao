import { environment } from '../../environments/environment';
import { destinoDe } from './legado';

describe('destinoDe', () => {
  it('aponta telas já migradas para a rota do Angular', () => {
    expect(destinoDe('/')).toEqual({ rota: '/' });
    expect(destinoDe('/dashboard')).toEqual({ rota: '/' });
    expect(destinoDe('/alterar-senha?returnUrl=%2F')).toEqual({ rota: '/alterar-senha' });
  });

  it('aponta telas não migradas para o legado, preservando a consulta', () => {
    expect(destinoDe('/estagios/dashboard')).toEqual({ href: `${environment.legadoUrl}/estagios/dashboard` });
    expect(destinoDe('/admin/rotinas?origem=x')).toEqual({ href: `${environment.legadoUrl}/admin/rotinas?origem=x` });
  });

  it('não gera destino quando o módulo não tem endereço', () => {
    expect(destinoDe(null)).toEqual({});
    expect(destinoDe('')).toEqual({});
  });
});
