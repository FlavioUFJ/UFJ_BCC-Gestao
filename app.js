/**
 * Aplicação Principal - Sistema de Gestão de Estágios UFJ BCC
 * Arquivo principal que configura e inicializa toda a aplicação
 */

const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const fs = require('fs');

// Importar configurações
const { database, session: sessionConfig, app: appConfig } = require('./src/config');
const DatabaseConfig = require('./src/config/DatabaseConfig');
const SessionConfig = require('./src/config/SessionConfig');

// Importar middlewares
const authMiddleware = require('./src/middleware/auth');
const validationMiddleware = require('./src/middleware/validation');
const loggingMiddleware = require('./src/middleware/logging');

// Importar rotas
const routes = require('./src/routes');

// Importar utilitários
const Helpers = require('./src/utils/helpers');

/**
 * Classe principal da aplicação
 */
class App {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || appConfig.port || 3000;
        this.environment = process.env.NODE_ENV || 'development';
        this.sessionStore = null;
        
        this.initializeDirectories();
        this.initializeDatabase();
        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }

    /**
     * Inicializa diretórios necessários
     */
    initializeDirectories() {
        const directories = [
            'uploads',
            'uploads/documentos',
            'uploads/relatorios',
            'uploads/temp',
            'logs',
            'public/css',
            'public/js',
            'public/images'
        ];

        directories.forEach(dir => {
            const fullPath = path.join(__dirname, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
                console.log(`📁 Diretório criado: ${dir}`);
            }
        });
    }

    /**
     * Inicializa conexão com banco de dados
     */
    async initializeDatabase() {
        try {
            const dbConfig = new DatabaseConfig();
            await dbConfig.testConnection();
            console.log('✅ Conexão com banco de dados estabelecida');
            
            // Configurar store de sessão
            this.sessionStore = new MySQLStore({
                host: database.host,
                port: database.port,
                user: database.user,
                password: database.password,
                database: database.database,
                clearExpired: true,
                checkExpirationInterval: 900000, // 15 minutos
                expiration: sessionConfig.maxAge,
                createDatabaseTable: true,
                schema: {
                    tableName: 'sessions',
                    columnNames: {
                        session_id: 'session_id',
                        expires: 'expires',
                        data: 'data'
                    }
                }
            });
            
        } catch (error) {
            console.error('❌ Erro ao conectar com banco de dados:', error.message);
            process.exit(1);
        }
    }

    /**
     * Inicializa middlewares
     */
    initializeMiddlewares() {
        // Segurança
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
                    scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
                    imgSrc: ["'self'", 'data:', 'https:'],
                    fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com']
                }
            }
        }));

        // Compressão
        this.app.use(compression());

        // CORS
        this.app.use(cors({
            origin: this.environment === 'production' ? appConfig.allowedOrigins : true,
            credentials: true
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: this.environment === 'production' ? 100 : 1000, // Limite de requests
            message: {
                error: 'Muitas tentativas. Tente novamente em 15 minutos.',
                code: 'RATE_LIMIT_EXCEEDED'
            },
            standardHeaders: true,
            legacyHeaders: false
        });
        this.app.use(limiter);

        // Rate limiting específico para login
        const loginLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 5, // Máximo 5 tentativas de login
            skipSuccessfulRequests: true,
            message: {
                error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
                code: 'LOGIN_RATE_LIMIT_EXCEEDED'
            }
        });
        this.app.use('/auth/login', loginLimiter);

        // Parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Arquivos estáticos
        this.app.use('/public', express.static(path.join(__dirname, 'public'), {
            maxAge: this.environment === 'production' ? '1d' : '0'
        }));
        this.app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
            maxAge: '1h'
        }));

        // View engine
        this.app.set('view engine', 'ejs');
        this.app.set('views', path.join(__dirname, 'views'));

        // Sessões
        const sessionMiddleware = session({
            key: sessionConfig.name,
            secret: sessionConfig.secret,
            store: this.sessionStore,
            resave: false,
            saveUninitialized: false,
            rolling: true,
            cookie: {
                secure: this.environment === 'production',
                httpOnly: true,
                maxAge: sessionConfig.maxAge,
                sameSite: 'lax'
            }
        });
        this.app.use(sessionMiddleware);

        // Configuração de upload
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                const uploadPath = path.join(__dirname, 'uploads', 'temp');
                cb(null, uploadPath);
            },
            filename: (req, file, cb) => {
                const uniqueName = Helpers.generateUniqueFilename(file.originalname);
                cb(null, uniqueName);
            }
        });

        const upload = multer({
            storage: storage,
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB
                files: 5
            },
            fileFilter: (req, file, cb) => {
                const allowedTypes = [
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'image/jpeg',
                    'image/png',
                    'image/gif'
                ];
                
                if (allowedTypes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new Error('Tipo de arquivo não permitido'), false);
                }
            }
        });
        this.app.use(upload.any());

        // Logging
        this.app.use(loggingMiddleware.requestLogger);

        // Variáveis globais para views
        this.app.use((req, res, next) => {
            res.locals.user = req.session?.user || null;
            res.locals.isAuthenticated = !!req.session?.user;
            res.locals.isAdmin = req.session?.user?.tipoacesso === 'administrador';
            res.locals.currentPath = req.path;
            res.locals.appName = appConfig.name || 'Sistema de Gestão de Estágios';
            res.locals.appVersion = appConfig.version || '1.0.0';
            res.locals.environment = this.environment;
            res.locals.helpers = Helpers;
            next();
        });

        // Middleware de autenticação
        this.app.use(authMiddleware.attachUser);
    }

    /**
     * Inicializa rotas
     */
    initializeRoutes() {
        // Rota de health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                environment: this.environment,
                version: appConfig.version || '1.0.0',
                uptime: process.uptime()
            });
        });

        // Rotas principais
        this.app.use('/', routes);
    }

    /**
     * Inicializa tratamento de erros
     */
    initializeErrorHandling() {
        // Middleware para rotas não encontradas
        this.app.use((req, res, next) => {
            const error = new Error(`Rota não encontrada: ${req.method} ${req.path}`);
            error.status = 404;
            next(error);
        });

        // Middleware de tratamento de erros do multer
        this.app.use((error, req, res, next) => {
            if (error instanceof multer.MulterError) {
                let message = 'Erro no upload do arquivo';
                
                switch (error.code) {
                    case 'LIMIT_FILE_SIZE':
                        message = 'Arquivo muito grande. Tamanho máximo: 10MB';
                        break;
                    case 'LIMIT_FILE_COUNT':
                        message = 'Muitos arquivos. Máximo: 5 arquivos';
                        break;
                    case 'LIMIT_UNEXPECTED_FILE':
                        message = 'Campo de arquivo inesperado';
                        break;
                }
                
                return res.status(400).json({
                    success: false,
                    message,
                    code: error.code
                });
            }
            next(error);
        });

        // Middleware principal de tratamento de erros
        this.app.use((error, req, res, next) => {
            // Log do erro
            loggingMiddleware.logError(error, req);

            // Status padrão
            const status = error.status || error.statusCode || 500;
            const message = error.message || 'Erro interno do servidor';

            // Resposta baseada no tipo de requisição
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                // Requisição AJAX
                res.status(status).json({
                    success: false,
                    message: this.environment === 'production' && status === 500 
                        ? 'Erro interno do servidor' 
                        : message,
                    code: error.code || 'INTERNAL_ERROR',
                    ...(this.environment === 'development' && { stack: error.stack })
                });
            } else {
                // Requisição normal
                res.status(status).render('error', {
                    title: 'Erro',
                    error: {
                        status,
                        message: this.environment === 'production' && status === 500 
                            ? 'Erro interno do servidor' 
                            : message
                    },
                    showStack: this.environment === 'development',
                    stack: error.stack
                });
            }
        });
    }

    /**
     * Inicia o servidor
     */
    async start() {
        try {
            // Aguardar inicialização do banco
            await this.initializeDatabase();
            
            // Iniciar servidor
            const server = this.app.listen(this.port, () => {
                console.log('🚀 Servidor iniciado com sucesso!');
                console.log(`📍 URL: http://localhost:${this.port}`);
                console.log(`🌍 Ambiente: ${this.environment}`);
                console.log(`📅 Iniciado em: ${new Date().toLocaleString('pt-BR')}`);
                console.log('=' .repeat(50));
            });

            // Graceful shutdown
            const gracefulShutdown = (signal) => {
                console.log(`\n🛑 Recebido sinal ${signal}. Encerrando servidor...`);
                
                server.close(async () => {
                    console.log('🔌 Servidor HTTP encerrado');
                    
                    try {
                        // Fechar conexões do banco
                        if (this.sessionStore) {
                            await this.sessionStore.close();
                            console.log('🗄️  Store de sessão encerrado');
                        }
                        
                        const dbConfig = new DatabaseConfig();
                        await dbConfig.closeConnection();
                        console.log('🗃️  Conexão com banco encerrada');
                        
                        console.log('✅ Aplicação encerrada com sucesso');
                        process.exit(0);
                    } catch (error) {
                        console.error('❌ Erro ao encerrar aplicação:', error);
                        process.exit(1);
                    }
                });
            };

            // Capturar sinais de encerramento
            process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
            process.on('SIGINT', () => gracefulShutdown('SIGINT'));
            
            // Capturar erros não tratados
            process.on('uncaughtException', (error) => {
                console.error('❌ Erro não capturado:', error);
                loggingMiddleware.logError(error);
                process.exit(1);
            });
            
            process.on('unhandledRejection', (reason, promise) => {
                console.error('❌ Promise rejeitada não tratada:', reason);
                loggingMiddleware.logError(new Error(`Unhandled Rejection: ${reason}`));
            });
            
            return server;
        } catch (error) {
            console.error('❌ Erro ao iniciar servidor:', error);
            process.exit(1);
        }
    }

    /**
     * Retorna instância do Express
     */
    getApp() {
        return this.app;
    }
}

// Exportar classe e instância
module.exports = App;

// Se executado diretamente, iniciar servidor
if (require.main === module) {
    const app = new App();
    app.start().catch(error => {
        console.error('❌ Falha ao iniciar aplicação:', error);
        process.exit(1);
    });
}