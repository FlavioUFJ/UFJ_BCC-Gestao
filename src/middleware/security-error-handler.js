/**
 * Middleware para tratamento de erros de segurança
 * Intercepta erros de segurança e executa logoff automático
 */

const { SecurityError } = require('./database-security');

/**
 * Middleware para capturar e tratar erros de segurança
 * @param {Error} err - Erro capturado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
function securityErrorHandler(err, req, res, next) {
    // Verificar se é um erro de segurança
    if (err instanceof SecurityError) {
        console.error('[SECURITY-VIOLATION]', {
            message: err.message,
            user: req.session?.user?.id_pessoa || 'não identificado',
            userLevel: req.session?.user?.nivelacesso || 'não identificado',
            table: err.table,
            operation: err.operation,
            timestamp: new Date().toISOString(),
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
        });

        // Destruir sessão (logoff)
        if (req.session) {
            req.session.destroy((destroyErr) => {
                if (destroyErr) {
                    console.error('[SECURITY-ERROR] Erro ao destruir sessão:', destroyErr);
                }
            });
        }

        // Limpar cookie de sessão
        if (res.clearCookie) {
            res.clearCookie('connect.sid');
        }

        // Responder com erro de segurança
        if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.headers['x-requested-with'] === 'XMLHttpRequest') {
            // Requisição AJAX
            return res.status(403).json({
                success: false,
                message: 'Houve uma restrição em executar a sua instrução!',
                security_violation: true,
                redirect: '/login'
            });
        } else {
            // Requisição normal
            return res.status(403).render('error', {
                title: 'Acesso Negado',
                message: 'Houve uma restrição em executar a sua instrução!',
                error: { status: 403 },
                showLoginButton: true,
                currentPage: 'error'
            });
        }
    }

    // Se não for erro de segurança, passar para o próximo middleware
    next(err);
}

module.exports = securityErrorHandler;