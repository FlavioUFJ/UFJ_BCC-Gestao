/**
 * Middleware de Logging e Auditoria
 * Registra atividades do sistema para auditoria e debugging
 */

const fs = require('fs');
const path = require('path');
const DatabaseConfig = require('../config/database');

/**
 * Classe para logging e auditoria
 */
class LoggingMiddleware {
    constructor() {
        this.db = new DatabaseConfig();
        this.logDir = path.join(process.cwd(), 'logs');
        this.ensureLogDirectory();
    }

    /**
     * Garante que o diretório de logs existe
     */
    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    /**
     * Middleware para logging de requisições HTTP
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     * @param {Function} next - Next middleware
     */
    static requestLogger(req, res, next) {
        const startTime = Date.now();
        const timestamp = new Date().toISOString();
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent') || 'Unknown';
        const userId = req.session?.user?.id_pessoa || null;
        const userName = req.session?.user?.nome || 'Anônimo';

        // Log da requisição
        const requestLog = {
            timestamp,
            method: req.method,
            url: req.originalUrl,
            ip,
            userAgent,
            userId,
            userName,
            body: LoggingMiddleware.sanitizeBody(req.body),
            query: req.query
        };

        // Interceptar a resposta
        const originalSend = res.send;
        res.send = function(data) {
            const endTime = Date.now();
            const duration = endTime - startTime;

            const responseLog = {
                ...requestLog,
                statusCode: res.statusCode,
                duration,
                responseSize: data ? data.length : 0
            };

            // Salvar log
            LoggingMiddleware.saveRequestLog(responseLog);

            // Chamar método original
            originalSend.call(this, data);
        };

        next();
    }

    /**
     * Middleware para auditoria de ações
     * @param {string} action - Ação realizada
     * @param {string} entity - Entidade afetada
     * @param {Object} details - Detalhes da ação
     */
    static auditLogger(action, entity, details = {}) {
        return async (req, res, next) => {
            // Executar próximo middleware primeiro
            const originalSend = res.send;
            res.send = function(data) {
                // Se a operação foi bem-sucedida, registrar auditoria
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    LoggingMiddleware.saveAuditLog({
                        action,
                        entity,
                        entityId: req.params.id || null,
                        userId: req.session?.user?.id_pessoa || null,
                        userName: req.session?.user?.nome || 'Sistema',
                        details: {
                            ...details,
                            ip: req.ip || req.connection.remoteAddress,
                            userAgent: req.get('User-Agent'),
                            timestamp: new Date().toISOString()
                        },
                        changes: LoggingMiddleware.sanitizeBody(req.body)
                    });
                }

                originalSend.call(this, data);
            };

            next();
        };
    }

    /**
     * Middleware para logging de erros
     * @param {Error} error - Erro ocorrido
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     * @param {Function} next - Next middleware
     */
    static errorLogger(error, req, res, next) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            request: {
                method: req.method,
                url: req.originalUrl,
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
                userId: req.session?.user?.id_pessoa || null,
                body: LoggingMiddleware.sanitizeBody(req.body),
                query: req.query
            }
        };

        LoggingMiddleware.saveErrorLog(errorLog);
        next(error);
    }

    /**
     * Salva log de requisição
     * @param {Object} logData - Dados do log
     */
    static saveRequestLog(logData) {
        try {
            const logFile = path.join(
                path.join(process.cwd(), 'logs'),
                `requests-${new Date().toISOString().split('T')[0]}.log`
            );
            
            const logLine = JSON.stringify(logData) + '\n';
            fs.appendFileSync(logFile, logLine);
        } catch (error) {
            console.error('Erro ao salvar log de requisição:', error);
        }
    }

    /**
     * Salva log de auditoria
     * @param {Object} auditData - Dados da auditoria
     */
    static async saveAuditLog(auditData) {
        try {
            // Salvar no arquivo
            const logFile = path.join(
                path.join(process.cwd(), 'logs'),
                `audit-${new Date().toISOString().split('T')[0]}.log`
            );
            
            const logLine = JSON.stringify(auditData) + '\n';
            fs.appendFileSync(logFile, logLine);

            // Salvar no banco de dados
            const db = new DatabaseConfig();
            await db.connect();
            
            const sql = `
                INSERT INTO auditoria (
                    acao, entidade, id_entidade, id_usuario, nome_usuario,
                    detalhes, alteracoes, ip, user_agent, data_hora
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            await db.run(sql, [
                auditData.action,
                auditData.entity,
                auditData.entityId,
                auditData.userId,
                auditData.userName,
                JSON.stringify(auditData.details),
                JSON.stringify(auditData.changes),
                auditData.details.ip,
                auditData.details.userAgent,
                auditData.details.timestamp
            ]);
            
            await db.close();
        } catch (error) {
            console.error('Erro ao salvar log de auditoria:', error);
        }
    }

    /**
     * Salva log de erro
     * @param {Object} errorData - Dados do erro
     */
    static saveErrorLog(errorData) {
        try {
            const logFile = path.join(
                path.join(process.cwd(), 'logs'),
                `errors-${new Date().toISOString().split('T')[0]}.log`
            );
            
            const logLine = JSON.stringify(errorData) + '\n';
            fs.appendFileSync(logFile, logLine);
        } catch (error) {
            console.error('Erro ao salvar log de erro:', error);
        }
    }

    /**
     * Sanitiza dados do body removendo informações sensíveis
     * @param {Object} body - Body da requisição
     * @returns {Object} Body sanitizado
     */
    static sanitizeBody(body) {
        if (!body || typeof body !== 'object') {
            return body;
        }

        const sanitized = { ...body };
        const sensitiveFields = [
            'senha', 'password', 'senhaAtual', 'novaSenha', 'confirmarSenha',
            'token', 'apiKey', 'secret', 'authorization'
        ];

        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        }

        return sanitized;
    }

    /**
     * Busca logs de auditoria
     * @param {Object} filters - Filtros de busca
     * @returns {Array} Logs encontrados
     */
    static async getAuditLogs(filters = {}) {
        try {
            const db = new DatabaseConfig();
            await db.connect();

            let sql = 'SELECT * FROM auditoria WHERE 1=1';
            const params = [];

            if (filters.userId) {
                sql += ' AND id_usuario = ?';
                params.push(filters.userId);
            }

            if (filters.entity) {
                sql += ' AND entidade = ?';
                params.push(filters.entity);
            }

            if (filters.action) {
                sql += ' AND acao = ?';
                params.push(filters.action);
            }

            if (filters.startDate) {
                sql += ' AND data_hora >= ?';
                params.push(filters.startDate);
            }

            if (filters.endDate) {
                sql += ' AND data_hora <= ?';
                params.push(filters.endDate);
            }

            sql += ' ORDER BY data_hora DESC';

            if (filters.limit) {
                sql += ' LIMIT ?';
                params.push(filters.limit);
            }

            const logs = await db.all(sql, params);
            await db.close();

            return logs;
        } catch (error) {
            console.error('Erro ao buscar logs de auditoria:', error);
            return [];
        }
    }

    /**
     * Limpa logs antigos
     * @param {number} daysToKeep - Dias para manter os logs
     */
    static async cleanOldLogs(daysToKeep = 90) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            // Limpar logs do banco
            const db = new DatabaseConfig();
            await db.connect();
            
            await db.run(
                'DELETE FROM auditoria WHERE data_hora < ?',
                [cutoffDate.toISOString()]
            );
            
            await db.close();

            // Limpar arquivos de log antigos
            const logFiles = fs.readdirSync(path.join(process.cwd(), 'logs'));
            
            for (const file of logFiles) {
                const filePath = path.join(path.join(process.cwd(), 'logs'), file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime < cutoffDate) {
                    fs.unlinkSync(filePath);
                    console.log(`Log antigo removido: ${file}`);
                }
            }
        } catch (error) {
            console.error('Erro ao limpar logs antigos:', error);
        }
    }

    /**
     * Gera relatório de atividades
     * @param {Object} filters - Filtros do relatório
     * @returns {Object} Relatório gerado
     */
    static async generateActivityReport(filters = {}) {
        try {
            const logs = await LoggingMiddleware.getAuditLogs(filters);
            
            const report = {
                totalActivities: logs.length,
                activitiesByUser: {},
                activitiesByEntity: {},
                activitiesByAction: {},
                timeline: []
            };

            for (const log of logs) {
                // Atividades por usuário
                const userName = log.nome_usuario || 'Sistema';
                report.activitiesByUser[userName] = (report.activitiesByUser[userName] || 0) + 1;

                // Atividades por entidade
                report.activitiesByEntity[log.entidade] = (report.activitiesByEntity[log.entidade] || 0) + 1;

                // Atividades por ação
                report.activitiesByAction[log.acao] = (report.activitiesByAction[log.acao] || 0) + 1;

                // Timeline
                report.timeline.push({
                    timestamp: log.data_hora,
                    user: userName,
                    action: log.acao,
                    entity: log.entidade,
                    entityId: log.id_entidade
                });
            }

            return report;
        } catch (error) {
            console.error('Erro ao gerar relatório de atividades:', error);
            return null;
        }
    }
}

module.exports = LoggingMiddleware;