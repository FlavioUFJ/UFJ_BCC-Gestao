/**
 * Utilitários para otimização de consultas SQL
 * Centraliza a lógica de construção de cláusulas WHERE complexas
 */

class SQLOptimizer {
    /**
     * Constrói condições de acesso baseadas no usuário para tabela campo_estagio
     * Otimiza as múltiplas condições OR repetitivas
     * @param {number} userId - ID do usuário
     * @param {string} nivelAcesso - Nível de acesso do usuário
     * @param {string} tableAlias - Alias da tabela campo_estagio (padrão: 'ce')
     * @returns {Object} { whereClause, params }
     */
    static buildUserAccessConditions(userId, nivelAcesso, tableAlias = 'ce') {
        // Administradores têm acesso total
        if (nivelAcesso === 'Administrador') {
            return {
                whereClause: '',
                params: []
            };
        }

        // Determinar o prefixo da tabela
        const tablePrefix = tableAlias ? `${tableAlias}.` : '';

        // Para não-administradores, usar uma única consulta com UNION otimizada
        // ao invés de múltiplas condições OR
        const whereClause = `
            ${tablePrefix}id_campo_estagio IN (
                SELECT DISTINCT id_campo_estagio FROM (
                    SELECT id_campo_estagio FROM campo_estagio WHERE id_pessoa_orientador = ?
                    UNION
                    SELECT id_campo_estagio FROM campo_estagio WHERE id_pessoa_supervisor = ?
                    UNION
                    SELECT id_campo_estagio FROM campo_estagio WHERE id_pessoa_estagiario = ?
                    UNION
                    SELECT id_campo_estagio FROM campo_estagio WHERE id_pessoa_concedente = ?
                ) AS user_estagios
            )`;

        return {
            whereClause,
            params: [userId, userId, userId, userId]
        };
    }

    /**
     * Constrói condições de acesso baseadas na categoria do usuário
     * Otimiza as consultas que fazem subconsultas desnecessárias
     * @param {number} userId - ID do usuário
     * @param {string} categoria - Categoria do usuário (já conhecida)
     * @param {string} tableAlias - Alias da tabela campo_estagio (padrão: 'ce')
     * @returns {Object} { whereClause, params }
     */
    static buildCategoryAccessConditions(userId, categoria, tableAlias = 'ce') {
        const conditions = {
            whereClause: '',
            params: []
        };

        switch (categoria) {
            case '1': // Coordenador - acesso total
                break;
                
            case '2': // Professor/Orientador
                conditions.whereClause = `${tableAlias}.id_pessoa_orientador = ?`;
                conditions.params = [userId];
                break;
                
            case '3': // Aluno/Estagiário
                conditions.whereClause = `${tableAlias}.id_pessoa_estagiario = ?`;
                conditions.params = [userId];
                break;
                
            case '4': // Concedente/Local de Estágio
                conditions.whereClause = `${tableAlias}.id_pessoa_concedente = ?`;
                conditions.params = [userId];
                break;
                
            case '5': // Supervisor
                conditions.whereClause = `${tableAlias}.id_pessoa_supervisor = ?`;
                conditions.params = [userId];
                break;
                
            case '6': // Instituição/Curso
                conditions.whereClause = `${tableAlias}.id_pessoa_curso = ?`;
                conditions.params = [userId];
                break;
                
            case '99': // Usuário Geral - sem acesso
                conditions.whereClause = '1 = 0';
                conditions.params = [];
                break;
                
            default: // Categoria não reconhecida - apenas próprios estágios
                conditions.whereClause = `${tableAlias}.id_pessoa_estagiario = ?`;
                conditions.params = [userId];
                break;
        }

        return conditions;
    }

    /**
     * Constrói cláusulas WHERE dinâmicas sem usar 'WHERE 1=1'
     * @param {Array} conditions - Array de condições
     * @returns {string} Cláusula WHERE otimizada
     */
    static buildDynamicWhere(conditions) {
        if (!conditions || conditions.length === 0) {
            return '';
        }

        const validConditions = conditions.filter(condition => 
            condition && condition.trim() !== '' && condition.trim() !== '1=1'
        );

        if (validConditions.length === 0) {
            return '';
        }

        return `WHERE ${validConditions.join(' AND ')}`;
    }

    /**
     * Otimiza consultas com CASE WHEN para usar índices
     * @param {string} field - Campo a ser verificado
     * @param {Object} cases - Objeto com os casos {valor: resultado}
     * @param {string} defaultValue - Valor padrão
     * @returns {string} Expressão CASE otimizada
     */
    static buildOptimizedCase(field, cases, defaultValue = '0') {
        const caseStatements = Object.entries(cases)
            .map(([value, result]) => `WHEN ${field} = '${value}' THEN ${result}`)
            .join(' ');

        return `CASE ${caseStatements} ELSE ${defaultValue} END`;
    }

    /**
     * Cache para categoria de usuário com TTL e estatísticas
     */
    static userCategoryCache = new Map();
    static cacheStats = {
        hits: 0,
        misses: 0,
        evictions: 0
    };
    static cacheTTL = 5 * 60 * 1000; // 5 minutos por padrão

    /**
     * Busca categoria do usuário com cache otimizado
     * @param {number} userId - ID do usuário
     * @param {Object} databaseConfig - Configuração do banco de dados
     * @param {number} ttl - TTL em milissegundos (opcional)
     * @returns {Promise<string>} Categoria do usuário
     */
    static async getUserCategoryWithCache(userId, databaseConfig, ttl = null) {
        const cacheKey = `user_category_${userId}`;
        const now = Date.now();
        
        // Verificar se existe no cache e não expirou
        if (this.userCategoryCache.has(cacheKey)) {
            const cacheEntry = this.userCategoryCache.get(cacheKey);
            if (now < cacheEntry.expiresAt) {
                this.cacheStats.hits++;
                return cacheEntry.value;
            } else {
                // Entrada expirada, remover
                this.userCategoryCache.delete(cacheKey);
                this.cacheStats.evictions++;
            }
        }

        // Cache miss - buscar no banco
        this.cacheStats.misses++;
        const usuario = await databaseConfig.get(
            'SELECT categoria FROM pessoa WHERE id_pessoa = ?', 
            [userId]
        );
        
        const categoria = usuario?.categoria || '99';
        const cacheTTL = ttl || this.cacheTTL;
        
        // Armazenar no cache com TTL
        this.userCategoryCache.set(cacheKey, {
            value: categoria,
            expiresAt: now + cacheTTL,
            createdAt: now
        });

        return categoria;
    }

    /**
     * Limpa o cache de categoria de usuário
     * @param {number} userId - ID específico do usuário (opcional)
     */
    static clearUserCategoryCache(userId = null) {
        if (userId) {
            const cacheKey = `user_category_${userId}`;
            if (this.userCategoryCache.has(cacheKey)) {
                this.userCategoryCache.delete(cacheKey);
                this.cacheStats.evictions++;
            }
        } else {
            const size = this.userCategoryCache.size;
            this.userCategoryCache.clear();
            this.cacheStats.evictions += size;
        }
    }

    /**
     * Limpa entradas expiradas do cache
     */
    static cleanExpiredCache() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, entry] of this.userCategoryCache.entries()) {
            if (now >= entry.expiresAt) {
                this.userCategoryCache.delete(key);
                cleaned++;
            }
        }
        
        this.cacheStats.evictions += cleaned;
        return cleaned;
    }

    /**
     * Obtém estatísticas do cache
     * @returns {Object} Estatísticas do cache
     */
    static getCacheStats() {
        const total = this.cacheStats.hits + this.cacheStats.misses;
        const hitRate = total > 0 ? (this.cacheStats.hits / total * 100).toFixed(2) : 0;
        
        return {
            ...this.cacheStats,
            size: this.userCategoryCache.size,
            hitRate: `${hitRate}%`,
            total
        };
    }

    /**
     * Configura o TTL padrão do cache
     * @param {number} ttl - TTL em milissegundos
     */
    static setCacheTTL(ttl) {
        if (typeof ttl === 'number' && ttl > 0) {
            this.cacheTTL = ttl;
            console.log(`Cache TTL atualizado para ${ttl}ms`);
        } else {
            throw new Error('TTL deve ser um número positivo');
        }
    }

    /**
     * Constrói condições LIKE insensíveis a acentos para busca em nomes
     * @param {string|Array} fields - Campo(s) para buscar
     * @param {string} searchTerm - Termo de busca
     * @param {string} operator - Operador lógico ('OR' ou 'AND')
     * @returns {Object} Objeto com whereClause e params
     */
    static buildAccentInsensitiveLike(fields, searchTerm, operator = 'OR') {
        if (!searchTerm || searchTerm.trim() === '') {
            return { whereClause: '', params: [] };
        }

        const fieldsArray = Array.isArray(fields) ? fields : [fields];
        const normalizedTerm = `%${searchTerm.trim()}%`;
        
        // Usar COLLATE utf8mb4_general_ci para busca insensível a acentos
        const conditions = fieldsArray.map(field => 
            `${field} COLLATE utf8mb4_general_ci LIKE ? COLLATE utf8mb4_general_ci`
        );
        
        const whereClause = `(${conditions.join(` ${operator} `)})`;
        const params = new Array(fieldsArray.length).fill(normalizedTerm);
        
        return { whereClause, params };
    }

    /**
     * Normaliza string removendo acentos para busca insensível
     * @param {string} str - String a ser normalizada
     * @returns {string} String normalizada sem acentos
     */
    static normalizeString(str) {
        if (!str || typeof str !== 'string') return '';
        
        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

    /**
     * Verifica se uma string contém outra de forma insensível a acentos
     * @param {string} text - Texto onde buscar
     * @param {string} search - Termo de busca
     * @returns {boolean} True se encontrou o termo
     */
    static accentInsensitiveIncludes(text, search) {
        if (!text || !search) return false;
        
        const normalizedText = this.normalizeString(text);
        const normalizedSearch = this.normalizeString(search);
        
        return normalizedText.includes(normalizedSearch);
    }

    /**
     * Constrói LEFT JOINs condicionais baseados nos campos necessários
     * Otimiza consultas evitando JOINs desnecessários
     * @param {Array} requiredFields - Campos necessários na consulta
     * @param {string} baseTableAlias - Alias da tabela base (padrão: 'ce')
     * @returns {string} Cláusula de JOINs otimizada
     */
    static buildOptimizedJoins(requiredFields, baseTableAlias = 'ce') {
        const joins = [];
        
        // Mapear campos para suas respectivas tabelas/aliases
        const fieldToJoinMap = {
            'nome_estagiario': 'pe',
            'pe.nome': 'pe',
            'nome_orientador': 'po', 
            'po.nome': 'po',
            'nome_supervisor': 'ps',
            'ps.nome': 'ps', 
            'nome_concedente': 'pc',
            'pc.nome': 'pc',
            'nome_curso': 'pcr',
            'pcr.nome': 'pcr',
            'pe.categoria': 'pe',
            'po.categoria': 'po',
            'ps.categoria': 'ps',
            'pc.categoria': 'pc',
            'pcr.categoria': 'pcr'
        };
        
        // Determinar quais JOINs são necessários
        const neededJoins = new Set();
        
        requiredFields.forEach(field => {
            const joinAlias = fieldToJoinMap[field];
            if (joinAlias) {
                neededJoins.add(joinAlias);
            }
        });
        
        // Construir JOINs apenas para as tabelas necessárias
        if (neededJoins.has('pe')) {
            joins.push(`LEFT JOIN pessoa pe ON ${baseTableAlias}.id_pessoa_estagiario = pe.id_pessoa`);
        }
        
        if (neededJoins.has('po')) {
            joins.push(`LEFT JOIN pessoa po ON ${baseTableAlias}.id_pessoa_orientador = po.id_pessoa`);
        }
        
        if (neededJoins.has('ps')) {
            joins.push(`LEFT JOIN pessoa ps ON ${baseTableAlias}.id_pessoa_supervisor = ps.id_pessoa`);
        }
        
        if (neededJoins.has('pc')) {
            joins.push(`LEFT JOIN pessoa pc ON ${baseTableAlias}.id_pessoa_concedente = pc.id_pessoa`);
        }
        
        if (neededJoins.has('pcr')) {
            joins.push(`LEFT JOIN pessoa pcr ON ${baseTableAlias}.id_pessoa_curso = pcr.id_pessoa`);
        }
        
        return joins.join('\n                ');
    }
}

module.exports = SQLOptimizer;