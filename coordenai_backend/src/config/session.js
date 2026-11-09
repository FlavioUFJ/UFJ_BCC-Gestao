/**
 * Configuração de Sessão
 * Centraliza as configurações de sessão do Express.
 *
 * O nome do cookie, o segredo e a tabela `sessions` são os mesmos do legado,
 * de modo que, durante a convivência dos dois sistemas atrás do mesmo proxy,
 * o login feito em um vale para o outro.
 */

const session = require('express-session');
const dadosConexao = require('./db-connection');
const auth = require('../middleware/auth');

const SEGREDO_DESENVOLVIMENTO = 'coordenai-somente-desenvolvimento';
const UM_DIA = 24 * 60 * 60 * 1000;

class SessionConfig {
    static get cookieName() {
        return process.env.SESSION_COOKIE_NAME || 'gestao.sid';
    }

    /**
     * Segredo da sessão. Em produção é obrigatório: a aplicação não sobe com
     * um valor padrão conhecido.
     */
    static getSecret() {
        const secret = process.env.SESSION_SECRET;
        if (secret) {
            return secret;
        }
        if (process.env.NODE_ENV === 'production') {
            throw new Error('SESSION_SECRET não definido. Configure-o no .env antes de iniciar em produção.');
        }
        return SEGREDO_DESENVOLVIMENTO;
    }

    /**
     * Cria o armazenamento de sessões em MySQL (uma única vez, na inicialização).
     */
    static createStore() {
        const MySQLStore = require('express-mysql-session')(session);
        return new MySQLStore({
            host: dadosConexao.host,
            port: dadosConexao.port,
            user: dadosConexao.user,
            password: dadosConexao.password,
            database: dadosConexao.database,
            clearExpired: true,
            checkExpirationInterval: 900000, // 15 minutos
            expiration: UM_DIA,
            createDatabaseTable: true,
            charset: 'utf8mb4_bin',
            connectionLimit: 10,
            schema: {
                tableName: 'sessions',
                columnNames: {
                    session_id: 'session_id',
                    expires: 'expires',
                    data: 'data'
                }
            }
        });
    }

    /**
     * Opções do middleware express-session.
     * @param {Object} store - Armazenamento de sessões
     */
    static getConfig(store) {
        return {
            name: SessionConfig.cookieName,
            secret: SessionConfig.getSecret(),
            store,
            resave: false,
            saveUninitialized: false,
            rolling: true, // Renova o cookie a cada requisição
            cookie: {
                secure: process.env.NODE_ENV === 'production', // HTTPS em produção
                httpOnly: true,
                maxAge: UM_DIA,
                sameSite: 'lax'
            }
        };
    }

    static requireAuth(req, res, next) {
        return auth.requireAuth(req, res, next);
    }

    static requireGuest(req, res, next) {
        return auth.requireGuest(req, res, next);
    }

    static requireAdmin(req, res, next) {
        return auth.requireAdmin(req, res, next);
    }

    static requirePermissions(permissoes) {
        return auth.requirePermissions(permissoes);
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
            nivelacesso: req.session.user.nivelacesso,
            categoria: req.session.user.categoria,
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
module.exports.requireAuth = SessionConfig.requireAuth;
module.exports.requireGuest = SessionConfig.requireGuest;
module.exports.requireAdmin = SessionConfig.requireAdmin;
module.exports.requirePermissions = SessionConfig.requirePermissions;
