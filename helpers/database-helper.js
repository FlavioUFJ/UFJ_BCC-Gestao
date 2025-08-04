/**
 * Helper para operações de banco de dados com controle de acesso
 * Facilita a integração do middleware de controle de acesso nas rotas
 */

const AccessControl = require('../middleware/access-control');
const sqlite3 = require('sqlite3').verbose();

class DatabaseHelper {
    constructor(dbPath = './database.db') {
        this.db = new sqlite3.Database(dbPath);
        this.accessControl = new AccessControl(this.db);
    }

    /**
     * Executa query SELECT com controle de acesso automático
     * @param {string} query - Query SQL
     * @param {Array} params - Parâmetros da query
     * @param {Object} user - Objeto do usuário logado {id_pessoa, tipoacesso}
     * @param {string} tableName - Nome da tabela principal
     * @returns {Promise<Array>}
     */
    async select(query, params = [], user, tableName) {
        if (!user || !user.id_pessoa) {
            throw new Error('Usuário não autenticado');
        }

        return await this.accessControl.executeWithAccess(
            query, 
            params, 
            user.id_pessoa, 
            tableName, 
            'all'
        );
    }

    /**
     * Executa query SELECT retornando apenas um registro
     * @param {string} query - Query SQL
     * @param {Array} params - Parâmetros da query
     * @param {Object} user - Objeto do usuário logado
     * @param {string} tableName - Nome da tabela principal
     * @returns {Promise<Object>}
     */
    async selectOne(query, params = [], user, tableName) {
        if (!user || !user.id_pessoa) {
            throw new Error('Usuário não autenticado');
        }

        return await this.accessControl.executeWithAccess(
            query, 
            params, 
            user.id_pessoa, 
            tableName, 
            'get'
        );
    }

    /**
     * Insere registro com validação de acesso
     * @param {string} tableName - Nome da tabela
     * @param {Object} data - Dados a serem inseridos
     * @param {Object} user - Objeto do usuário logado
     * @returns {Promise<Object>}
     */
    async insert(tableName, data, user) {
        if (!user || !user.id_pessoa) {
            throw new Error('Usuário não autenticado');
        }

        // Valida se usuário pode inserir o registro
        const canModify = await this.accessControl.canModifyRecord(tableName, data, user.id_pessoa);
        if (!canModify) {
            throw new Error('Usuário não tem permissão para inserir este registro');
        }

        const columns = Object.keys(data);
        const placeholders = columns.map(() => '?').join(', ');
        const values = Object.values(data);

        const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

        return new Promise((resolve, reject) => {
            this.db.run(query, values, function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }

    /**
     * Atualiza registro com validação de acesso
     * @param {string} tableName - Nome da tabela
     * @param {Object} data - Dados a serem atualizados
     * @param {Object} where - Condições WHERE
     * @param {Object} user - Objeto do usuário logado
     * @returns {Promise<Object>}
     */
    async update(tableName, data, where, user) {
        if (!user || !user.id_pessoa) {
            throw new Error('Usuário não autenticado');
        }

        // Primeiro verifica se o registro existe e se o usuário tem acesso
        const whereColumns = Object.keys(where);
        const whereValues = Object.values(where);
        const whereClause = whereColumns.map(col => `${col} = ?`).join(' AND ');
        
        const checkQuery = `SELECT * FROM ${tableName} WHERE ${whereClause}`;
        const existingRecord = await this.selectOne(checkQuery, whereValues, user, tableName);
        
        if (!existingRecord) {
            throw new Error('Registro não encontrado ou usuário não tem acesso');
        }

        // Valida se usuário pode modificar o registro
        const mergedData = { ...existingRecord, ...data };
        const canModify = await this.accessControl.canModifyRecord(tableName, mergedData, user.id_pessoa);
        if (!canModify) {
            throw new Error('Usuário não tem permissão para editar este registro');
        }

        const updateColumns = Object.keys(data);
        const updateValues = Object.values(data);
        const setClause = updateColumns.map(col => `${col} = ?`).join(', ');

        const query = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;
        const allValues = [...updateValues, ...whereValues];

        return new Promise((resolve, reject) => {
            this.db.run(query, allValues, function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ changes: this.changes });
            });
        });
    }

    /**
     * Remove registro com validação de acesso
     * @param {string} tableName - Nome da tabela
     * @param {Object} where - Condições WHERE
     * @param {Object} user - Objeto do usuário logado
     * @returns {Promise<Object>}
     */
    async delete(tableName, where, user) {
        if (!user || !user.id_pessoa) {
            throw new Error('Usuário não autenticado');
        }

        // Primeiro verifica se o registro existe e se o usuário tem acesso
        const whereColumns = Object.keys(where);
        const whereValues = Object.values(where);
        const whereClause = whereColumns.map(col => `${col} = ?`).join(' AND ');
        
        const checkQuery = `SELECT * FROM ${tableName} WHERE ${whereClause}`;
        const existingRecord = await this.selectOne(checkQuery, whereValues, user, tableName);
        
        if (!existingRecord) {
            throw new Error('Registro não encontrado ou usuário não tem acesso');
        }

        const query = `DELETE FROM ${tableName} WHERE ${whereClause}`;

        return new Promise((resolve, reject) => {
            this.db.run(query, whereValues, function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ changes: this.changes });
            });
        });
    }

    /**
     * Executa query personalizada com controle de acesso
     * @param {string} query - Query SQL
     * @param {Array} params - Parâmetros
     * @param {Object} user - Usuário logado
     * @param {string} tableName - Tabela principal
     * @param {string} method - Método ('all', 'get', 'run')
     * @returns {Promise}
     */
    async executeCustom(query, params, user, tableName, method = 'all') {
        if (!user || !user.id_pessoa) {
            throw new Error('Usuário não autenticado');
        }

        return await this.accessControl.executeWithAccess(
            query, 
            params, 
            user.id_pessoa, 
            tableName, 
            method
        );
    }

    /**
     * Gera condições de acesso para JOINs complexos
     * @param {Object} user - Usuário logado
     * @param {string} tableAlias - Alias da tabela
     * @returns {Promise<string>}
     */
    async getJoinAccessConditions(user, tableAlias = 'ce') {
        if (!user || !user.id_pessoa) {
            throw new Error('Usuário não autenticado');
        }

        return await this.accessControl.generateJoinAccessConditions(user.id_pessoa, tableAlias);
    }

    /**
     * Verifica se usuário é administrador
     * @param {Object} user - Usuário logado
     * @returns {Promise<boolean>}
     */
    async isAdmin(user) {
        if (!user || !user.id_pessoa) {
            return false;
        }

        return await this.accessControl.isAdmin(user.id_pessoa);
    }

    /**
     * Fecha conexão com banco de dados
     */
    close() {
        this.db.close();
    }
}

module.exports = DatabaseHelper;