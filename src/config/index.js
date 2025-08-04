/**
 * Configuração Principal do Sistema
 * Centraliza todas as configurações e constantes da aplicação
 */

require('dotenv').config();

const path = require('path');

/**
 * Configurações do ambiente
 */
const environment = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 3000,
    DEBUG: process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development'
};

/**
 * Configurações de caminhos
 */
const paths = {
    root: path.resolve(__dirname, '../..'),
    src: path.resolve(__dirname, '..'),
    views: path.resolve(__dirname, '../../views'),
    public: path.resolve(__dirname, '../../public'),
    uploads: path.resolve(__dirname, '../../uploads'),
    backups: path.resolve(__dirname, '../../backups'),
    database: path.resolve(__dirname, '../../database.db'),
    logs: path.resolve(__dirname, '../../logs')
};

/**
 * Configurações de upload de arquivos
 */
const upload = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: {
        images: ['image/jpeg', 'image/png', 'image/gif'],
        documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        excel: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    },
    destinations: {
        temp: path.join(paths.uploads, 'temp'),
        documents: path.join(paths.uploads, 'documents'),
        reports: path.join(paths.uploads, 'reports'),
        signatures: path.join(paths.uploads, 'signatures')
    }
};

/**
 * Enums do sistema
 */
const enums = {
    statusEstagio: {
        ATIVO: 'Ativo',
        INATIVO: 'Inativo',
        CONCLUIDO: 'Concluído',
        CANCELADO: 'Cancelado'
    },
    
    tipoEstagio: {
        OBRIGATORIO: 'Obrigatório',
        NAO_OBRIGATORIO: 'Não Obrigatório'
    },
    
    tipoAcesso: {
        ADMINISTRADOR: 'Administrador',
        ORIENTADOR: 'Orientador',
        ESTAGIARIO: 'Estagiário',
        EMPRESA: 'Empresa'
    },
    
    statusRelatorio: {
        PENDENTE: 'Pendente',
        ENVIADO: 'Enviado',
        APROVADO: 'Aprovado',
        REJEITADO: 'Rejeitado'
    },
    
    statusPlanoAtividade: {
        RASCUNHO: 'Rascunho',
        ENVIADO: 'Enviado',
        APROVADO: 'Aprovado',
        REJEITADO: 'Rejeitado'
    }
};

/**
 * Configurações de paginação
 */
const pagination = {
    defaultLimit: 20,
    maxLimit: 100,
    defaultPage: 1
};

/**
 * Configurações de validação
 */
const validation = {
    password: {
        minLength: 6,
        requireUppercase: false,
        requireLowercase: false,
        requireNumbers: false,
        requireSpecialChars: false
    },
    email: {
        maxLength: 255
    },
    text: {
        shortText: 255,
        mediumText: 1000,
        longText: 5000
    }
};

/**
 * Configurações de cache
 */
const cache = {
    ttl: {
        short: 5 * 60, // 5 minutos
        medium: 30 * 60, // 30 minutos
        long: 60 * 60, // 1 hora
        veryLong: 24 * 60 * 60 // 24 horas
    }
};

/**
 * Configurações de log
 */
const logging = {
    level: environment.DEBUG ? 'debug' : 'info',
    file: {
        enabled: true,
        path: path.join(paths.logs, 'app.log'),
        maxSize: '10m',
        maxFiles: '14d'
    },
    console: {
        enabled: environment.DEBUG
    }
};

/**
 * Configurações de segurança
 */
const security = {
    bcrypt: {
        saltRounds: 12
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'gestao-estagio-jwt-secret',
        expiresIn: '24h'
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutos
        max: 100, // máximo 100 requests por IP
        message: 'Muitas tentativas. Tente novamente em 15 minutos.'
    },
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true
    }
};

/**
 * Configurações de backup
 */
const backup = {
    schedule: '0 2 * * *', // Todo dia às 2h da manhã
    retention: {
        daily: 7, // 7 dias
        weekly: 4, // 4 semanas
        monthly: 12 // 12 meses
    },
    compression: true
};

/**
 * Mensagens do sistema
 */
const messages = {
    success: {
        created: 'Registro criado com sucesso!',
        updated: 'Registro atualizado com sucesso!',
        deleted: 'Registro excluído com sucesso!',
        login: 'Login realizado com sucesso!',
        logout: 'Logout realizado com sucesso!',
        emailSent: 'Email enviado com sucesso!'
    },
    error: {
        notFound: 'Registro não encontrado.',
        unauthorized: 'Acesso não autorizado.',
        forbidden: 'Acesso negado.',
        validation: 'Dados inválidos fornecidos.',
        database: 'Erro interno do sistema.',
        emailFailed: 'Falha no envio do email.',
        uploadFailed: 'Falha no upload do arquivo.',
        invalidCredentials: 'Credenciais inválidas.'
    },
    info: {
        processing: 'Processando...',
        loading: 'Carregando...',
        noData: 'Nenhum registro encontrado.'
    }
};

/**
 * Configuração completa do sistema
 */
const config = {
    environment,
    paths,
    upload,
    enums,
    pagination,
    validation,
    cache,
    logging,
    security,
    backup,
    messages
};

/**
 * Função para validar configurações essenciais
 */
function validateConfig() {
    const required = [
        'environment.NODE_ENV',
        'environment.PORT',
        'paths.database'
    ];
    
    const missing = [];
    
    required.forEach(path => {
        const keys = path.split('.');
        let current = config;
        
        for (const key of keys) {
            if (current[key] === undefined) {
                missing.push(path);
                break;
            }
            current = current[key];
        }
    });
    
    if (missing.length > 0) {
        throw new Error(`Configurações obrigatórias não encontradas: ${missing.join(', ')}`);
    }
    
    console.log('✓ Configurações validadas com sucesso');
}

/**
 * Função para imprimir informações de configuração
 */
function printConfig() {
    if (environment.DEBUG) {
        console.log('=== CONFIGURAÇÃO DO SISTEMA ===');
        console.log(`Ambiente: ${environment.NODE_ENV}`);
        console.log(`Porta: ${environment.PORT}`);
        console.log(`Debug: ${environment.DEBUG}`);
        console.log(`Banco de dados: ${paths.database}`);
        console.log('================================');
    }
}

// Validar configurações na inicialização
validateConfig();

module.exports = {
    ...config,
    validateConfig,
    printConfig
};