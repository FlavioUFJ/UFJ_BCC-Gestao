/**
 * Autenticação e autorização da API.
 *
 * Implementação única: substitui as três versões de `requireAuth` do legado
 * (config/session.js, routes/secure-routes.js e routes/frequencias.js).
 * A API nunca redireciona: responde 401 (não autenticado) ou 403 (sem permissão)
 * e o frontend decide a navegação.
 */

const ADMINISTRADOR = 'Administrador';

function naoAutenticado(res) {
    return res.status(401).json({
        success: false,
        code: 'NAO_AUTENTICADO',
        message: 'Usuário não autenticado. Faça login para continuar.'
    });
}

function acessoNegado(res, message = 'Acesso negado.') {
    return res.status(403).json({ success: false, code: 'ACESSO_NEGADO', message });
}

function usuarioDaSessao(req) {
    return (req.session && req.session.user) || null;
}

function isAdmin(req) {
    const user = usuarioDaSessao(req);
    return !!user && user.nivelacesso === ADMINISTRADOR;
}

function requireAuth(req, res, next) {
    if (!usuarioDaSessao(req)) {
        return naoAutenticado(res);
    }
    next();
}

/**
 * Mantido por compatibilidade com as rotas herdadas. Numa API não há páginas
 * "só para visitantes", então apenas segue adiante.
 */
function requireGuest(req, res, next) {
    next();
}

function requireAdmin(req, res, next) {
    if (!usuarioDaSessao(req)) {
        return naoAutenticado(res);
    }
    if (!isAdmin(req)) {
        return acessoNegado(res, 'Acesso negado. Apenas administradores podem acessar este recurso.');
    }
    next();
}

/**
 * Exige uma das permissões informadas (nomes de módulos vinculados ao usuário).
 * Administrador sempre passa. Mesma regra do legado.
 * @param {Array|string} permissoes
 */
function requirePermissions(permissoes) {
    const exigidas = Array.isArray(permissoes) ? permissoes : [permissoes];

    return (req, res, next) => {
        const user = usuarioDaSessao(req);
        if (!user) {
            return naoAutenticado(res);
        }

        const doUsuario = user.permissoes || [];
        const permitido = user.nivelacesso === ADMINISTRADOR ||
            exigidas.some((p) => doUsuario.includes(p));

        if (!permitido) {
            return acessoNegado(res, 'Permissões insuficientes');
        }
        next();
    };
}

// Parâmetros cujo conteúdo é sigiloso (credenciais do servidor de e-mail)
const PARAMETROS_RESTRITOS = ['conta e-mail'];

function normalizar(texto) {
    return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function restrito(item) {
    return !!item && typeof item === 'object' && !Array.isArray(item) &&
        PARAMETROS_RESTRITOS.includes(normalizar(item.identificador));
}

/**
 * Remove de uma resposta os parâmetros sigilosos, em qualquer nível.
 * Devolve `undefined` quando o próprio valor é um parâmetro sigiloso.
 */
function semParametrosRestritos(valor) {
    if (Array.isArray(valor)) {
        return valor.filter((item) => !restrito(item)).map(semParametrosRestritos);
    }
    if (valor && typeof valor === 'object' && Object.getPrototypeOf(valor) === Object.prototype) {
        if (restrito(valor)) {
            return undefined;
        }
        const copia = {};
        for (const [chave, conteudo] of Object.entries(valor)) {
            copia[chave] = semParametrosRestritos(conteudo);
        }
        return copia;
    }
    return valor;
}

/**
 * Impede que quem não é administrador leia parâmetros sigilosos.
 *
 * As consultas de parâmetros usam LIKE e há rotas que listam todos, então
 * validar o texto pesquisado não basta: o filtro é aplicado sobre a resposta.
 */
function protegerParametrosRestritos(req, res, next) {
    if (isAdmin(req)) {
        return next();
    }

    const jsonOriginal = res.json.bind(res);
    res.json = (corpo) => {
        const filtrado = semParametrosRestritos(corpo);
        if (filtrado && typeof filtrado === 'object' && !Array.isArray(filtrado)) {
            const removido = ['resultado', 'parametro'].some(
                (chave) => corpo[chave] !== undefined && corpo[chave] !== null && filtrado[chave] === undefined
            );
            if (removido) {
                return acessoNegado(Object.assign(res, { json: jsonOriginal }),
                    'Acesso negado. Este parâmetro é restrito a administradores.');
            }
        }
        return jsonOriginal(filtrado);
    };
    next();
}

module.exports = {
    protegerParametrosRestritos,
    semParametrosRestritos,
    ADMINISTRADOR,
    isAdmin,
    requireAuth,
    requireGuest,
    requireAdmin,
    requirePermissions
};
