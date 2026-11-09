/**
 * Configuração de produção.
 *
 * apiUrl    - caminho da API (coordenai_backend) atrás do proxy.
 * legadoUrl - endereço do sistema legado, para onde vão os links das telas
 *             ainda não migradas. Vazio = mesma origem deste frontend.
 */
export const environment = {
  producao: true,
  apiUrl: '/api',
  legadoUrl: '',
};
