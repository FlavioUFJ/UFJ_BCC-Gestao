/**
 * CoordenAI - Backend (API REST)
 *
 * Monta a aplicação Express. Não serve páginas nem arquivos estáticos:
 * todas as rotas ficam sob /api e respondem em JSON. A interface é o projeto
 * `coordenai_frontend`.
 */

const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const multer = require('multer');

const config = require('./src/config');
const SessionConfig = require('./src/config/session');
const apiAdapter = require('./src/middleware/api-adapter');
const csrfProtection = require('./src/middleware/csrf');
const LoggingMiddleware = require('./src/middleware/logging');
const securityErrorHandler = require('./src/middleware/security-error-handler');
const CacheManager = require('./src/middleware/cache-manager');

const QUINZE_MINUTOS = 15 * 60 * 1000;

const chavePorIpEEmail = (req) => `${req.ip}|${String(req.body?.email || '').trim().toLowerCase()}`;

/**
 * Cria a aplicação.
 * @param {Object} [opcoes]
 * @param {Object} [opcoes.sessionStore] - Armazenamento de sessões. Se omitido,
 *        usa o do express-session em memória (adequado apenas a testes).
 */
function createApp(opcoes = {}) {
    const app = express();
    const environment = process.env.NODE_ENV || 'development';
    const producao = environment === 'production';

    // A aplicação fica atrás de um proxy reverso (Apache/Nginx)
    app.set('trust proxy', 1);
    app.disable('x-powered-by');

    ['logs', 'backups'].forEach((dir) => {
        fs.mkdirSync(path.join(__dirname, dir), { recursive: true });
    });
    fs.mkdirSync(config.paths.uploads, { recursive: true });

    // ----- Segurança e infraestrutura -----
    app.use(helmet());
    app.use(compression());

    if (config.security.cors.origin) {
        app.use(cors({ origin: config.security.cors.origin, credentials: true }));
    }

    app.use(rateLimit({
        windowMs: QUINZE_MINUTOS,
        max: producao ? 1000 : 2000,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Muitas requisições. Tente novamente em 15 minutos.'
        }
    }));

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Tentativas de login e de recuperação de senha: contadas por IP + email, para que vários usuários
    // atrás do mesmo IP (rede da universidade) não se bloqueiem entre si.
    app.use('/api/auth/login', rateLimit({
        windowMs: QUINZE_MINUTOS,
        max: 10,
        skipSuccessfulRequests: true,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: chavePorIpEEmail,
        message: {
            success: false,
            code: 'LOGIN_RATE_LIMIT_EXCEEDED',
            message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
        }
    }));

    app.use('/api/auth/forgot-password', rateLimit({
        windowMs: QUINZE_MINUTOS,
        max: 3,
        keyGenerator: chavePorIpEEmail,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            code: 'FORGOT_PASSWORD_RATE_LIMIT_EXCEEDED',
            message: 'Muitas tentativas de recuperação de senha. Tente novamente em 15 minutos.'
        }
    }));

    // ----- Sessão -----
    app.use(session(SessionConfig.getConfig(opcoes.sessionStore)));

    app.use(LoggingMiddleware.requestLogger);

    // ----- Rotas -----
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            version: config.app?.version || '1.0.0',
            uptime: process.uptime()
        });
    });

    app.use('/api', csrfProtection, apiAdapter);
    app.use('/api', require('./src/routes'));
    app.use('/api/secure', require('./src/routes/secure'));

    // ----- Erros -----
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            code: 'ROTA_NAO_ENCONTRADA',
            message: `Rota não encontrada: ${req.method} ${req.path}`
        });
    });

    app.use(securityErrorHandler);

    app.use((error, req, res, next) => {
        if (!(error instanceof multer.MulterError)) {
            return next(error);
        }

        const mensagens = {
            LIMIT_FILE_SIZE: 'Arquivo muito grande. Tamanho máximo: 10MB',
            LIMIT_FILE_COUNT: 'Muitos arquivos. Máximo: 5 arquivos',
            LIMIT_UNEXPECTED_FILE: 'Campo de arquivo inesperado'
        };

        res.status(400).json({
            success: false,
            code: error.code,
            message: mensagens[error.code] || 'Erro no upload do arquivo'
        });
    });

    // eslint-disable-next-line no-unused-vars
    app.use((error, req, res, next) => {
        LoggingMiddleware.logError(error, req);

        const status = error.status || error.statusCode || 500;
        const ocultar = producao && status >= 500;

        res.status(status).json({
            success: false,
            code: error.code || 'INTERNAL_ERROR',
            message: ocultar ? 'Erro interno do servidor' : (error.message || 'Erro interno do servidor'),
            ...(environment === 'development' && { stack: error.stack })
        });
    });

    return app;
}

/**
 * Inicia o servidor HTTP com sessões em MySQL.
 */
function start() {
    const database = require('./src/config/database');
    const sessionStore = SessionConfig.createStore();
    const app = createApp({ sessionStore });
    const port = process.env.PORT || config.environment.PORT || 3001;

    CacheManager.initialize();

    const server = app.listen(port, () => {
        console.log(`CoordenAI backend em http://localhost:${port}/api (${process.env.NODE_ENV || 'development'})`);
        // Sinaliza ao PM2 (wait_ready) que a aplicação está pronta
        if (process.send) {
            process.send('ready');
        }
    });

    const encerrar = (sinal) => {
        console.log(`Recebido ${sinal}. Encerrando...`);
        server.close(async () => {
            try {
                if (typeof sessionStore.close === 'function') {
                    await sessionStore.close();
                }
                await database.close();
                process.exit(0);
            } catch (error) {
                console.error('Erro ao encerrar aplicação:', error);
                process.exit(1);
            }
        });
    };

    process.on('SIGTERM', () => encerrar('SIGTERM'));
    process.on('SIGINT', () => encerrar('SIGINT'));

    process.on('uncaughtException', (error) => {
        console.error('Erro não capturado:', error);
        LoggingMiddleware.logError(error);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
        console.error('Promise rejeitada não tratada:', reason);
        LoggingMiddleware.logError(new Error(`Unhandled Rejection: ${reason}`));
    });

    return server;
}

module.exports = { createApp, start };
