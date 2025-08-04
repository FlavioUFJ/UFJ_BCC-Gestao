/**
 * Configuração de Sessão
 * Centraliza todas as configurações relacionadas às sessões do Express
 */

const session = require('express-session');

class SessionConfig {
    /**
     * Retorna a configuração de sessão para o Express
     * @param {Object} options - Opções adicionais
     * @returns {Object}
     */
    static getConfig(options = {}) {
        const defaultConfig = {
            secret: process.env.SESSION_SECRET || 'gestao-estagio-secret-key-2024',
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: process.env.NODE_ENV === 'production', // HTTPS em produção
                maxAge: 24 * 60 * 60 * 1000, // 24 horas
                httpOnly: true, // Previne acesso via JavaScript
                sameSite: 'lax' // Proteção CSRF
            },
            name: 'gestao.sid', // Nome customizado do cookie
            rolling: true // Renova o cookie a cada requisição
        };

        return { ...defaultConfig, ...options };
    }

    /**
     * Middleware para verificar se o usuário está autenticado
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     * @param {Function} next - Next function
     */
    static requireAuth(req, res, next) {
        if (!req.session || !req.session.user) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                // Para requisições AJAX
                return res.status(401).json({ 
                    error: 'Não autenticado', 
                    redirect: '/login' 
                });
            } else {
                // Para requisições normais
                return res.redirect('/login');
            }
        }
        next();
    }

    /**
     * Middleware para verificar se o usuário é administrador
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     * @param {Function} next - Next function
     */
    static requireAdmin(req, res, next) {
        if (!req.session || !req.session.user) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(401).json({ 
                    error: 'Não autenticado', 
                    redirect: '/login' 
                });
            } else {
                return res.redirect('/login');
            }
        }

        if (req.session.user.tipoacesso !== 'Administrador') {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(403).json({ 
                    error: 'Acesso negado. Apenas administradores podem acessar este recurso.' 
                });
            } else {
                return res.status(403).render('error', {
                    title: 'Acesso Negado',
                    message: 'Apenas administradores podem acessar este recurso.',
                    error: { status: 403 }
                });
            }
        }
        next();
    }

    /**
     * Middleware para verificar permissões específicas
     * @param {Array|string} permissoes - Permissões necessárias
     * @returns {Function}
     */
    static requirePermissions(permissoes) {
        const permissoesArray = Array.isArray(permissoes) ? permissoes : [permissoes];
        
        return (req, res, next) => {
            if (!req.session || !req.session.user) {
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(401).json({ 
                        error: 'Não autenticado', 
                        redirect: '/login' 
                    });
                } else {
                    return res.redirect('/login');
                }
            }

            const userPermissions = req.session.user.permissoes || [];
            const hasPermission = permissoesArray.some(perm => 
                userPermissions.includes(perm) || 
                req.session.user.tipoacesso === 'Administrador'
            );

            if (!hasPermission) {
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(403).json({ 
                        error: 'Permissões insuficientes' 
                    });
                } else {
                    return res.status(403).render('error', {
                        title: 'Acesso Negado',
                        message: 'Você não tem permissão para acessar este recurso.',
                        error: { status: 403 }
                    });
                }
            }
            next();
        };
    }

    /**
     * Extrai dados do usuário da sessão
     * @param {Object} req - Request object
     * @returns {Object|null}
     */
    static getUserFromSession(req) {
        if (!req.session || !req.session.user) {
            return null;
        }
        
        return {
            id_pessoa: req.session.user.id_pessoa,
            nome: req.session.user.nome,
            email: req.session.user.email,
            tipoacesso: req.session.user.tipoacesso,
            permissoes: req.session.user.permissoes || []
        };
    }

    /**
     * Limpa a sessão do usuário
     * @param {Object} req - Request object
     * @returns {Promise}
     */
    static logout(req) {
        return new Promise((resolve, reject) => {
            req.session.destroy((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Atualiza dados do usuário na sessão
     * @param {Object} req - Request object
     * @param {Object} userData - Novos dados do usuário
     */
    static updateUserSession(req, userData) {
        if (req.session && req.session.user) {
            req.session.user = { ...req.session.user, ...userData };
        }
    }
}

module.exports = SessionConfig;