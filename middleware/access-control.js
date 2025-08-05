/**
 * Middleware de Controle de Acesso
 * Implementa lógica de filtro baseada no nível de acesso do usuário
 * e suas relações com a tabela Pessoa
 */

const sqlite3 = require('sqlite3').verbose();

// Mapeamento das tabelas e suas colunas que referenciam Pessoa
const PESSOA_RELATIONS = {
    'pessoa': ['id_pessoa'],
    'pessoaFisica': ['id_pessoa'],
    'pessoaJuridica': ['id_pessoa'],
    'campo_estagio': ['id_pessoa_curso', 'id_pessoa_estagiario', 'id_pessoa_orientador', 'id_pessoa_concedente', 'id_pessoa_supervisor'],
    'pessoa_login': ['id_pessoa'],
    'usuario_modulos': ['id_pessoa'],
    'campo_estagio_relatorio': [], // Relaciona indiretamente via campo_estagio
    'campo_estagio_planoatividade': [] // Relaciona indiretamente via campo_estagio
};

// Tabelas que se relacionam indiretamente com Pessoa via campo_estagio
const INDIRECT_RELATIONS = {
    'campo_estagio_relatorio': 'id_campo_estagio',
    'campo_estagio_planoatividade': 'id_campo_estagio'
};

class AccessControl {
    constructor(db) {
        this.db = db;
    }

    /**
     * Verifica se o usuário é administrador
     * @param {number} userId - ID do usuário
     * @returns {Promise<boolean>}
     */
    async isAdmin(userId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT pl.tipoacesso 
                FROM pessoa_login pl 
                WHERE pl.id_pessoa = ? AND pl.status = 'Ativo'
            `;
            
            this.db.get(query, [userId], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row && row.tipoacesso === 'Administrador');
            });
        });
    }

    /**
     * Aplica filtro de acesso a uma query SQL
     * @param {string} originalQuery - Query SQL original
     * @param {number} userId - ID do usuário logado
     * @param {string} mainTable - Tabela principal da query
     * @returns {Promise<string>} - Query modificada com filtros de acesso
     */
    async applyAccessFilter(originalQuery, userId, mainTable) {
        const isUserAdmin = await this.isAdmin(userId);
        
        // Se é administrador, retorna query original
        if (isUserAdmin) {
            return originalQuery;
        }

        // Aplica filtro baseado na tabela
        return this.addAccessConditions(originalQuery, userId, mainTable);
    }

    /**
     * Adiciona condições de acesso à query
     * @param {string} query - Query original
     * @param {number} userId - ID do usuário
     * @param {string} tableName - Nome da tabela principal
     * @returns {string} - Query com condições de acesso
     */
    addAccessConditions(query, userId, tableName) {
        const lowerQuery = query.toLowerCase();
        const tableRelations = PESSOA_RELATIONS[tableName];
        
        if (!tableRelations) {
            console.warn(`Tabela ${tableName} não mapeada para controle de acesso`);
            return query;
        }

        // Detectar alias da tabela na query
        const tableAlias = this.detectTableAlias(query, tableName);
        
        let conditions = [];
        
        // Relações diretas com Pessoa
        if (tableRelations.length > 0) {
            const directConditions = tableRelations.map(column => 
                `${tableAlias}.${column} = ${userId}`
            );
            conditions.push(`(${directConditions.join(' OR ')})`);
        }
        
        // Relações indiretas via campo_estagio
        if (INDIRECT_RELATIONS[tableName]) {
            const indirectCondition = `
                ${tableName}.${INDIRECT_RELATIONS[tableName]} IN (
                    SELECT ce.id_campo_estagio 
                    FROM campo_estagio ce 
                    WHERE ce.id_pessoa_curso = ${userId} 
                       OR ce.id_pessoa_estagiario = ${userId}
                       OR ce.id_pessoa_orientador = ${userId}
                       OR ce.id_pessoa_concedente = ${userId}
                       OR ce.id_pessoa_supervisor = ${userId}
                )
            `;
            conditions.push(`(${indirectCondition})`);
        }
        
        if (conditions.length === 0) {
            return query;
        }
        
        // Adiciona condições WHERE ou AND conforme necessário
        const accessCondition = conditions.join(' OR ');
        
        if (lowerQuery.includes('where')) {
            return query + ` AND (${accessCondition})`;
        } else {
            // Encontra posição para inserir WHERE
            const insertPosition = this.findWhereInsertPosition(query);
            return query.slice(0, insertPosition) + ` WHERE (${accessCondition})` + query.slice(insertPosition);
        }
    }

    /**
     * Detecta o alias da tabela na query SQL
     * @param {string} query - Query SQL
     * @param {string} tableName - Nome da tabela
     * @returns {string} - Alias da tabela ou nome completo se não encontrar alias
     */
    detectTableAlias(query, tableName) {
        const lowerQuery = query.toLowerCase();
        const lowerTableName = tableName.toLowerCase();
        
        // Procurar padrões como "FROM campo_estagio ce" ou "JOIN campo_estagio ce"
        const patterns = [
            new RegExp(`from\\s+${lowerTableName}\\s+(\\w+)`, 'i'),
            new RegExp(`join\\s+${lowerTableName}\\s+(\\w+)`, 'i'),
            new RegExp(`${lowerTableName}\\s+(\\w+)\\s+on`, 'i')
        ];
        
        for (const pattern of patterns) {
            const match = lowerQuery.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        // Se não encontrar alias, retorna o nome da tabela
        return tableName;
    }

    /**
     * Encontra posição adequada para inserir cláusula WHERE
     * @param {string} query - Query SQL
     * @returns {number} - Posição para inserir WHERE
     */
    findWhereInsertPosition(query) {
        const lowerQuery = query.toLowerCase();
        const keywords = ['order by', 'group by', 'having', 'limit'];
        
        for (const keyword of keywords) {
            const index = lowerQuery.indexOf(keyword);
            if (index !== -1) {
                return index;
            }
        }
        
        return query.length;
    }

    /**
     * Wrapper para execução de queries com controle de acesso
     * @param {string} query - Query SQL
     * @param {Array} params - Parâmetros da query
     * @param {number} userId - ID do usuário
     * @param {string} tableName - Tabela principal
     * @param {string} method - Método de execução ('all', 'get', 'run')
     * @returns {Promise}
     */
    async executeWithAccess(query, params, userId, tableName, method = 'all') {
        const filteredQuery = await this.applyAccessFilter(query, userId, tableName);
        
        return new Promise((resolve, reject) => {
            this.db[method](filteredQuery, params, (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(result);
            });
        });
    }

    /**
     * Valida se usuário pode inserir/editar registro
     * @param {string} tableName - Nome da tabela
     * @param {Object} data - Dados a serem inseridos/editados
     * @param {number} userId - ID do usuário
     * @returns {Promise<boolean>}
     */
    async canModifyRecord(tableName, data, userId) {
        const isUserAdmin = await this.isAdmin(userId);
        
        if (isUserAdmin) {
            return true;
        }
        
        const tableRelations = PESSOA_RELATIONS[tableName];
        if (!tableRelations || tableRelations.length === 0) {
            return false;
        }
        
        // Verifica se pelo menos uma das colunas de pessoa está vinculada ao usuário
        // Converte ambos para string para garantir comparação correta
        const userIdStr = String(userId);
        return tableRelations.some(column => {
            const columnValue = String(data[column] || '');
            console.log(`DEBUG - Verificando permissão: coluna ${column} = '${columnValue}', userId = '${userIdStr}'`);
            return columnValue === userIdStr;
        });
    }

    /**
     * Gera condições SQL para filtros de acesso em JOINs complexos
     * @param {number} userId - ID do usuário
     * @param {string} tableAlias - Alias da tabela no JOIN
     * @returns {Promise<string>}
     */
    async generateJoinAccessConditions(userId, tableAlias = 'ce') {
        const isUserAdmin = await this.isAdmin(userId);
        
        if (isUserAdmin) {
            return '1=1'; // Sempre verdadeiro para admin
        }
        
        return `(
            ${tableAlias}.id_pessoa_curso = ${userId} OR
            ${tableAlias}.id_pessoa_estagiario = ${userId} OR
            ${tableAlias}.id_pessoa_orientador = ${userId} OR
            ${tableAlias}.id_pessoa_concedente = ${userId} OR
            ${tableAlias}.id_pessoa_supervisor = ${userId}
        )`;
    }
}

module.exports = AccessControl;