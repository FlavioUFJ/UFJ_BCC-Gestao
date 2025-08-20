/**
 * Utilitário para normalização de texto - Remove acentos e caracteres especiais
 * Usado para melhorar a funcionalidade de busca em toda a aplicação
 */

/**
 * Normaliza texto removendo acentos e convertendo para minúsculas
 * @param {string} texto - Texto a ser normalizado
 * @returns {string} - Texto normalizado sem acentos e em minúsculas
 */
function normalizarTexto(texto) {
    if (!texto) return '';
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Função de busca melhorada que funciona com e sem acentos
 * @param {string} textoOriginal - Texto onde buscar
 * @param {string} termoBusca - Termo de busca
 * @returns {boolean} - True se encontrou o termo
 */
function buscaComAcentos(textoOriginal, termoBusca) {
    if (!textoOriginal || !termoBusca) return false;
    
    const texto = textoOriginal.toLowerCase();
    const termo = termoBusca.toLowerCase();
    
    // Busca normal (mantém compatibilidade)
    const buscaNormal = texto.includes(termo);
    
    // Busca normalizada (sem acentos)
    const buscaNormalizada = normalizarTexto(textoOriginal).includes(normalizarTexto(termoBusca));
    
    return buscaNormal || buscaNormalizada;
}

/**
 * Função para filtrar array de objetos com busca melhorada
 * @param {Array} array - Array de objetos para filtrar
 * @param {string} termoBusca - Termo de busca
 * @param {Array} campos - Array com nomes dos campos a serem pesquisados
 * @returns {Array} - Array filtrado
 */
function filtrarComAcentos(array, termoBusca, campos) {
    if (!termoBusca || termoBusca.trim() === '') {
        return array;
    }
    
    return array.filter(item => {
        return campos.some(campo => {
            const valor = item[campo];
            return valor && buscaComAcentos(valor, termoBusca);
        });
    });
}

// Exportar para uso em Node.js se disponível
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        normalizarTexto,
        buscaComAcentos,
        filtrarComAcentos
    };
}