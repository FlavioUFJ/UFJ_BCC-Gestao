/**
 * Middleware de Debug para Rotas de Parâmetros
 * Ajuda a identificar problemas específicos na versão web
 */

const debugParametroMiddleware = (req, res, next) => {
    console.log('[PARAMETRO-DEBUG] =================================');
    console.log('[PARAMETRO-DEBUG] Requisição para rota de parâmetro');
    console.log('[PARAMETRO-DEBUG] URL:', req.originalUrl);
    console.log('[PARAMETRO-DEBUG] Method:', req.method);
    console.log('[PARAMETRO-DEBUG] Query:', req.query);
    console.log('[PARAMETRO-DEBUG] Headers:', {
        'user-agent': req.headers['user-agent'],
        'referer': req.headers['referer'],
        'origin': req.headers['origin'],
        'cookie': req.headers['cookie'] ? 'Presente' : 'Ausente'
    });
    console.log('[PARAMETRO-DEBUG] Session exists:', !!req.session);
    console.log('[PARAMETRO-DEBUG] User authenticated:', !!req.session?.user);
    console.log('[PARAMETRO-DEBUG] Environment:', process.env.NODE_ENV);
    console.log('[PARAMETRO-DEBUG] =================================');
    
    // Interceptar a resposta para log
    const originalSend = res.send;
    res.send = function(data) {
        console.log('[PARAMETRO-DEBUG] Resposta enviada:', {
            statusCode: res.statusCode,
            dataLength: data ? data.length : 0,
            dataPreview: data ? data.substring(0, 200) : 'Sem dados'
        });
        return originalSend.call(this, data);
    };
    
    next();
};

module.exports = debugParametroMiddleware;