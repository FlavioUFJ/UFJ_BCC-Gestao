/**
 * Armazenamento de arquivos enviados (uploads).
 *
 * Os arquivos ficam fora de qualquer pasta servida como estática: só saem
 * pelas rotas autenticadas de download.
 *
 * O banco guarda o caminho no formato do legado
 * (`/public/uploads/planos-atividade/<arquivo>`). Aqui apenas o nome do
 * arquivo é aproveitado, e a pasta real vem de UPLOADS_DIR. Durante a
 * convivência com o legado, aponte UPLOADS_DIR para a pasta
 * `public/uploads` dele, para que os dois sistemas vejam os mesmos arquivos.
 */

const fs = require('fs');
const path = require('path');

const PREFIXO_LEGADO = '/public/uploads';

function raiz() {
    return path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, '../../storage/uploads'));
}

/**
 * Pasta de uma categoria de upload (criada se não existir).
 * @param {string} categoria - ex.: 'planos-atividade'
 */
function pasta(categoria) {
    const dir = path.join(raiz(), categoria);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

/**
 * Valor gravado no banco para um arquivo salvo.
 */
function caminhoParaBanco(categoria, nomeArquivo) {
    return `${PREFIXO_LEGADO}/${categoria}/${path.basename(nomeArquivo)}`;
}

/**
 * Converte o valor gravado no banco no caminho real do arquivo.
 * Usa somente o nome do arquivo, o que impede sair da pasta de uploads.
 * @returns {string|null}
 */
function resolver(categoria, caminhoDoBanco) {
    if (!caminhoDoBanco) {
        return null;
    }
    const nome = path.basename(String(caminhoDoBanco).replace(/\\/g, '/'));
    if (!nome || nome === '.' || nome === '..') {
        return null;
    }
    return path.join(raiz(), categoria, nome);
}

module.exports = { raiz, pasta, caminhoParaBanco, resolver };
