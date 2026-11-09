/**
 * Configuração de desenvolvimento (`ng serve`).
 * O proxy em proxy.conf.json encaminha /api para o backend em localhost:3001.
 */
export const environment = {
  producao: false,
  apiUrl: '/api',
  legadoUrl: 'http://localhost:3000',
};
