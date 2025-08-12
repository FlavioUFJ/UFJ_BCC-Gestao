/**
 * Middleware de Segurança de Banco de Dados
 * Intercepta operações críticas e verifica permissões de administrador
 */

class DatabaseSecurity {
    constructor() {
        // Tabelas que só podem ser modificadas por administradores
        this.restrictedTables = [
            'pessoa',
            'pessoa_fisica', 
            'pessoa_juridica',
            'pessoa_login',
            'pessoa_modulos',
            'modulos',
            'parametro',
            'parametro_valor'
        ];
        
        // Operações que são restritas
        this.restrictedOperations = ['INSERT', 'UPDATE', 'DELETE'];
    }

    /**
     * Verifica se a tabela é restrita
     * @param {string} tableName - Nome da tabela
     * @returns {boolean}
     */
    isRestrictedTable(tableName) {
        return this.restrictedTables.includes(tableName.toLowerCase());
    }

    /**
     * Verifica se a operação é restrita
     * @param {string} operation - Tipo de operação (INSERT, UPDATE, DELETE)
     * @returns {boolean}
     */
    isRestrictedOperation(operation) {
        return this.restrictedOperations.includes(operation.toUpperCase());
    }

    /**
     * Verifica se o usuário é administrador
     * @param {Object} user - Objeto do usuário da sessão
     * @returns {boolean}
     */
    isAdmin(user) {
        return user && user.nivelacesso === 'Administrador';
    }

    /**
     * Middleware para interceptar operações de modelo
     * @param {string} tableName - Nome da tabela
     * @param {string} operation - Operação (create, update, delete)
     * @param {Object} req - Request object (para acessar sessão)
     * @returns {Promise<void>}
     */
    async checkPermission(tableName, operation, req) {
        // Verificar se é uma tabela restrita
        if (!this.isRestrictedTable(tableName)) {
            return; // Tabela não restrita, permitir operação
        }

        // Mapear operações do modelo para operações SQL
        const operationMap = {
            'create': 'INSERT',
            'update': 'UPDATE', 
            'delete': 'DELETE'
        };

        const sqlOperation = operationMap[operation.toLowerCase()];
        
        // Verificar se é uma operação restrita
        if (!this.isRestrictedOperation(sqlOperation)) {
            return; // Operação não restrita, permitir
        }

        // Verificar se há usuário na sessão
        if (!req || !req.session || !req.session.user) {
            throw new SecurityError('Usuário não autenticado para operação em tabela restrita');
        }

        // Verificar se é administrador
        if (!this.isAdmin(req.session.user)) {
            // Log da tentativa de acesso não autorizado
            console.warn(`[SECURITY ALERT] Tentativa de ${operation} na tabela ${tableName} por usuário não-admin:`, {
                userId: req.session.user.id_pessoa,
                userName: req.session.user.nome,
                userLevel: req.session.user.nivelacesso,
                operation: operation,
                table: tableName,
                timestamp: new Date().toISOString(),
                ip: req.ip || req.connection?.remoteAddress,
                userAgent: req.get ? req.get('User-Agent') : 'N/A'
            });
            
            throw new SecurityError('Houve uma restrição em executar a sua instrução!');
        }
    }

    /**
     * Middleware Express para verificar permissões em rotas
     * @param {string} tableName - Nome da tabela
     * @param {string} operation - Operação
     * @returns {Function}
     */
    checkRoutePermission(tableName, operation) {
        return async (req, res, next) => {
            try {
                await this.checkPermission(tableName, operation, req);
                next();
            } catch (error) {
                if (error instanceof SecurityError) {
                    // Forçar logout do usuário
                    if (req.session) {
                        req.session.destroy((err) => {
                            if (err) {
                                console.error('Erro ao destruir sessão:', err);
                            }
                        });
                    }

                    // Verificar se é requisição AJAX
                    const isAjax = req.xhr || 
                                  req.headers['x-requested-with'] === 'XMLHttpRequest' ||
                                  req.headers.accept?.indexOf('json') > -1 ||
                                  req.headers['content-type']?.indexOf('json') > -1;

                    if (isAjax) {
                        return res.status(403).json({
                            success: false,
                            message: error.message,
                            forceLogout: true,
                            redirect: '/auth/login'
                        });
                    } else {
                        return res.status(403).render('error', {
                            title: 'Acesso Negado',
                            message: error.message,
                            error: { status: 403 },
                            currentPage: 'error'
                        });
                    }
                } else {
                    next(error);
                }
            }
        };
    }

    /**
     * Intercepta métodos do BaseModel para adicionar verificação de segurança
     * @param {Object} modelInstance - Instância do modelo
     * @param {Object} req - Request object
     */
    interceptModelMethods(modelInstance, req) {
        const originalCreate = modelInstance.create.bind(modelInstance);
        const originalUpdate = modelInstance.update.bind(modelInstance);
        const originalDelete = modelInstance.delete.bind(modelInstance);

        modelInstance.create = async (data) => {
            await this.checkPermission(modelInstance.tableName, 'create', req);
            return originalCreate(data);
        };

        modelInstance.update = async (id, data) => {
            await this.checkPermission(modelInstance.tableName, 'update', req);
            return originalUpdate(id, data);
        };

        modelInstance.delete = async (id) => {
            await this.checkPermission(modelInstance.tableName, 'delete', req);
            return originalDelete(id);
        };

        return modelInstance;
    }
}

/**
 * Classe de erro de segurança personalizada
 */
class SecurityError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SecurityError';
    }
}

// Instância singleton
const databaseSecurity = new DatabaseSecurity();

module.exports = {
    DatabaseSecurity,
    SecurityError,
    databaseSecurity
};