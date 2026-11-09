/**
 * Proteção CSRF por "double submit cookie".
 *
 * O servidor entrega um token aleatório no cookie XSRF-TOKEN (legível pelo
 * JavaScript da mesma origem). Em toda requisição que altera estado, o
 * frontend devolve o mesmo valor no cabeçalho X-XSRF-TOKEN. Um site de
 * terceiros não consegue ler o cookie, logo não consegue montar o cabeçalho.
 *
 * Os nomes do cookie e do cabeçalho são os padrões do HttpClient do Angular,
 * que faz esse envio automaticamente.
 */

const crypto = require('crypto');

const COOKIE = 'XSRF-TOKEN';
const HEADER = 'x-xsrf-token';
const METODOS_SEGUROS = ['GET', 'HEAD', 'OPTIONS'];

function lerCookie(req, nome) {
    const cabecalho = req.headers.cookie;
    if (!cabecalho) {
        return null;
    }
    for (const parte of cabecalho.split(';')) {
        const indice = parte.indexOf('=');
        if (indice > -1 && parte.slice(0, indice).trim() === nome) {
            return decodeURIComponent(parte.slice(indice + 1).trim());
        }
    }
    return null;
}

function iguais(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function csrfProtection(req, res, next) {
    let token = lerCookie(req, COOKIE);

    if (!token) {
        token = crypto.randomBytes(32).toString('hex');
        res.cookie(COOKIE, token, {
            httpOnly: false, // precisa ser lido pelo frontend
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/'
        });
        // Sem cookie não há como a requisição atual trazer o cabeçalho correto
        if (!METODOS_SEGUROS.includes(req.method)) {
            return res.status(403).json({
                success: false,
                code: 'CSRF_INVALIDO',
                message: 'Token de segurança ausente. Recarregue a página e tente novamente.'
            });
        }
        return next();
    }

    if (METODOS_SEGUROS.includes(req.method)) {
        return next();
    }

    const enviado = req.headers[HEADER];
    if (!enviado || !iguais(enviado, token)) {
        return res.status(403).json({
            success: false,
            code: 'CSRF_INVALIDO',
            message: 'Token de segurança inválido. Recarregue a página e tente novamente.'
        });
    }

    next();
}

module.exports = csrfProtection;
