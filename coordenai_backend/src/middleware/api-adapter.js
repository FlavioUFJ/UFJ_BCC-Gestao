/**
 * Adaptador de respostas da API.
 *
 * Os controllers herdados do legado respondem de duas formas: JSON quando a
 * requisição é AJAX e HTML (`res.render`) ou redirecionamento (`res.redirect`)
 * quando é navegação de página. Este backend não tem views, então:
 *
 *  1. toda requisição é marcada como AJAX/JSON, para que os controllers sigam
 *     pelo ramo JSON que já existe;
 *  2. os `res.render` e `res.redirect` que restarem são convertidos em JSON.
 *
 * Em alguns métodos o ramo de página entrega mais dados que o ramo JSON (por
 * exemplo, as listas que preenchiam os campos de um formulário). Para obter
 * esses dados, o frontend envia o cabeçalho `X-View-Data: 1`: a requisição
 * segue pelo ramo de página e o conteúdo que iria para a view volta em
 * `{ success: true, data: {...} }`.
 *
 * Isso permite manter o código de negócio dos controllers sem reescrevê-lo.
 * À medida que cada tela for migrada para o Angular, o controller
 * correspondente pode ser simplificado e deixar de depender deste adaptador.
 */

// Campos que só faziam sentido para as views EJS
const CAMPOS_DE_VIEW = ['layout', 'currentPage', 'currentUrl', 'originalUrl', 'helpers', 'title'];

function dadosDaView(dados = {}) {
    const limpo = { ...dados };
    CAMPOS_DE_VIEW.forEach((campo) => delete limpo[campo]);
    return limpo;
}

function apiAdapter(req, res, next) {
    if (req.headers['x-view-data'] === '1') {
        // Dados de página: o controller segue pelo ramo que chamava res.render
        req.headers.accept = 'text/html';
        delete req.headers['x-requested-with'];
    } else {
        // 1. Tratar a requisição como AJAX/JSON
        const accept = req.headers.accept || '';
        if (!accept.includes('json')) {
            req.headers.accept = accept ? `${accept}, application/json` : 'application/json';
        }
        req.headers['x-requested-with'] = 'XMLHttpRequest';
    }

    // 2a. res.render -> JSON
    res.render = function renderComoJson(view, dados) {
        const opcoes = typeof dados === 'object' && dados !== null ? dados : {};

        if (view === 'error') {
            if (res.statusCode < 400) {
                res.status(500);
            }
            return res.json({
                success: false,
                message: opcoes.message || 'Erro interno do servidor'
            });
        }

        return res.json({ success: true, data: dadosDaView(opcoes) });
    };

    // 2b. res.redirect -> JSON
    res.redirect = function redirectComoJson(statusOuUrl, talvezUrl) {
        const url = typeof statusOuUrl === 'string' ? statusOuUrl : talvezUrl;
        let params = new URLSearchParams();
        try {
            params = new URL(url, 'http://localhost').searchParams;
        } catch (erro) {
            // URL inválida: segue sem parâmetros
        }

        const erro = params.get('error');
        if (erro) {
            return res.status(400).json({ success: false, message: erro });
        }

        const caminho = String(url || '').split('?')[0];
        if (caminho.endsWith('/auth/login') && !(req.session && req.session.user) && !params.get('success')) {
            return res.status(401).json({
                success: false,
                code: 'NAO_AUTENTICADO',
                message: 'Usuário não autenticado. Faça login para continuar.'
            });
        }

        const corpo = { success: true, redirect: caminho };
        if (params.get('success')) {
            corpo.message = params.get('success');
        }
        return res.json(corpo);
    };

    next();
}

module.exports = apiAdapter;
