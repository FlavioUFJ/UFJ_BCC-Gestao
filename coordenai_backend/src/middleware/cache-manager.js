const SQLOptimizer = require('../utils/sql-optimizer');

/**
 * Middleware para gerenciamento de cache
 */
class CacheManager {
    /**
     * Inicializa o gerenciador de cache com limpeza automática
     * @param {number} cleanupInterval - Intervalo de limpeza em milissegundos (padrão: 10 minutos)
     */
    static initialize(cleanupInterval = 10 * 60 * 1000) {
        // Limpeza automática de entradas expiradas
        setInterval(() => {
            const cleaned = SQLOptimizer.cleanExpiredCache();
            if (cleaned > 0) {
                console.log(`[CacheManager] Limpeza automática: ${cleaned} entradas removidas`);
            }
        }, cleanupInterval);

        console.log('[CacheManager] Inicializado com limpeza automática');
    }

    /**
     * Middleware para adicionar headers de cache nas respostas
     */
    static addCacheHeaders(req, res, next) {
        const stats = SQLOptimizer.getCacheStats();
        
        // Adicionar headers informativos sobre o cache
        res.set({
            'X-Cache-Size': stats.size.toString(),
            'X-Cache-Hit-Rate': stats.hitRate,
            'X-Cache-Total-Requests': stats.total.toString()
        });

        next();
    }

    /**
     * Endpoint para estatísticas do cache
     */
    static getCacheStatsEndpoint(req, res) {
        try {
            const stats = SQLOptimizer.getCacheStats();
            
            res.json({
                success: true,
                data: {
                    cache: stats,
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime()
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erro ao obter estatísticas do cache',
                error: error.message
            });
        }
    }

    /**
     * Endpoint para limpeza manual do cache
     */
    static clearCacheEndpoint(req, res) {
        try {
            const { userId } = req.body;
            
            if (userId) {
                SQLOptimizer.clearUserCategoryCache(userId);
                res.json({
                    success: true,
                    message: `Cache do usuário ${userId} limpo com sucesso`
                });
            } else {
                SQLOptimizer.clearUserCategoryCache();
                res.json({
                    success: true,
                    message: 'Cache completo limpo com sucesso'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erro ao limpar cache',
                error: error.message
            });
        }
    }

    /**
     * Endpoint para limpeza de entradas expiradas
     */
    static cleanExpiredCacheEndpoint(req, res) {
        try {
            const cleaned = SQLOptimizer.cleanExpiredCache();
            
            res.json({
                success: true,
                message: `${cleaned} entradas expiradas removidas`,
                cleaned
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erro ao limpar entradas expiradas',
                error: error.message
            });
        }
    }
}

module.exports = CacheManager;