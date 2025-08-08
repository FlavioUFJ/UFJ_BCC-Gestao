/**
 * Modelo Base
 * Classe abstrata que fornece funcionalidades comuns para todos os modelos
 */

const databaseConfig = require('../config/database');
const { validation, messages } = require('../config');

class BaseModel {
    constructor(tableName, primaryKey = 'id') {
        if (this.constructor === BaseModel) {
            throw new Error('BaseModel é uma classe abstrata e não pode ser instanciada diretamente');
        }
        
        this.tableName = tableName;
        this.primaryKey = primaryKey;
        this.fillable = []; // Campos que podem ser preenchidos em massa
        this.hidden = []; // Campos que devem ser ocultados na serialização
        this.rules = {}; // Regras de validação
    }

    /**
     * Busca todos os registros
     * @param {Object} options - Opções de consulta
     * @returns {Promise<Array>}
     */
    async findAll(options = {}) {
        try {
            const {
                where = '',
                orderBy = '',
                limit = null,
                offset = null,
                params = []
            } = options;

            let query = `SELECT * FROM ${this.tableName}`;
            
            if (where) {
                query += ` WHERE ${where}`;
            }
            
            if (orderBy) {
                query += ` ORDER BY ${orderBy}`;
            }
            
            if (limit) {
                query += ` LIMIT ${limit}`;
                if (offset) {
                    query += ` OFFSET ${offset}`;
                }
            }

            const results = await databaseConfig.all(query, params);
            return results.map(result => this.hideFields(result));
        } catch (error) {
            console.error(`Erro ao buscar registros de ${this.tableName}:`, error);
            throw new Error(messages.error.database);
        }
    }

    /**
     * Busca um registro por ID
     * @param {number|string} id - ID do registro
     * @returns {Promise<Object|null>}
     */
    async findById(id) {
        try {
            const query = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ?`;
            const result = await databaseConfig.get(query, [id]);
            return result ? this.hideFields(result) : null;
        } catch (error) {
            console.error(`Erro ao buscar registro ${id} de ${this.tableName}:`, error);
            throw new Error(messages.error.database);
        }
    }

    /**
     * Busca um registro por condições
     * @param {Object} conditions - Condições de busca
     * @returns {Promise<Object|null>}
     */
    async findOne(conditions) {
        try {
            const { where, params } = this.buildWhereClause(conditions);
            const query = `SELECT * FROM ${this.tableName} WHERE ${where} LIMIT 1`;
            const result = await databaseConfig.get(query, params);
            return result ? this.hideFields(result) : null;
        } catch (error) {
            console.error(`Erro ao buscar registro de ${this.tableName}:`, error);
            throw new Error(messages.error.database);
        }
    }

    /**
     * Cria um novo registro
     * @param {Object} data - Dados do registro
     * @returns {Promise<Object>}
     */
    async create(data) {
        try {
            // Validar dados
            await this.validate(data);
            
            // Filtrar apenas campos permitidos
            const filteredData = this.filterFillable(data);
            
            // Construir query de inserção
            const fields = Object.keys(filteredData);
            const placeholders = fields.map(() => '?').join(', ');
            const values = Object.values(filteredData);
            
            const query = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
            
            const result = await databaseConfig.run(query, values);
            
            // Buscar e retornar o registro criado
            return await this.findById(result.id);
        } catch (error) {
            console.error(`Erro ao criar registro em ${this.tableName}:`, error);
            if (error.message.includes('validation')) {
                throw error;
            }
            throw new Error(messages.error.database);
        }
    }

    /**
     * Atualiza um registro
     * @param {number|string} id - ID do registro
     * @param {Object} data - Dados para atualização
     * @returns {Promise<Object|null>}
     */
    async update(id, data) {
        try {
            // Verificar se o registro existe
            const existing = await this.findById(id);
            if (!existing) {
                throw new Error(messages.error.notFound);
            }
            
            // Validar dados
            await this.validate(data, id);
            
            // Filtrar apenas campos permitidos
            const filteredData = this.filterFillable(data);
            
            if (Object.keys(filteredData).length === 0) {
                return existing;
            }
            
            // Construir query de atualização
            const fields = Object.keys(filteredData);
            const setClause = fields.map(field => `${field} = ?`).join(', ');
            const values = [...Object.values(filteredData), id];
            
            const query = `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.primaryKey} = ?`;
            
            await databaseConfig.run(query, values);
            
            // Buscar e retornar o registro atualizado
            return await this.findById(id);
        } catch (error) {
            console.error(`Erro ao atualizar registro ${id} em ${this.tableName}:`, error);
            if (error.message.includes('validation') || error.message.includes('não encontrado')) {
                throw error;
            }
            throw new Error(messages.error.database);
        }
    }

    /**
     * Exclui um registro
     * @param {number|string} id - ID do registro
     * @returns {Promise<boolean>}
     */
    async delete(id) {
        try {
            // Verificar se o registro existe
            const existing = await this.findById(id);
            if (!existing) {
                throw new Error(messages.error.notFound);
            }
            
            const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`;
            const result = await databaseConfig.run(query, [id]);
            
            return result.changes > 0;
        } catch (error) {
            console.error(`Erro ao excluir registro ${id} de ${this.tableName}:`, error);
            if (error.message.includes('não encontrado')) {
                throw error;
            }
            throw new Error(messages.error.database);
        }
    }

    /**
     * Conta registros
     * @param {Object} conditions - Condições de contagem
     * @returns {Promise<number>}
     */
    async count(conditions = {}) {
        try {
            let query = `SELECT COUNT(*) as total FROM ${this.tableName}`;
            let params = [];
            
            if (Object.keys(conditions).length > 0) {
                const { where, params: whereParams } = this.buildWhereClause(conditions);
                query += ` WHERE ${where}`;
                params = whereParams;
            }
            
            const result = await databaseConfig.get(query, params);
            return result.total;
        } catch (error) {
            console.error(`Erro ao contar registros de ${this.tableName}:`, error);
            throw new Error(messages.error.database);
        }
    }

    /**
     * Constrói cláusula WHERE a partir de condições
     * @param {Object} conditions - Condições
     * @returns {Object}
     */
    buildWhereClause(conditions) {
        const whereParts = [];
        const params = [];
        
        Object.entries(conditions).forEach(([field, value]) => {
            if (Array.isArray(value)) {
                const placeholders = value.map(() => '?').join(', ');
                whereParts.push(`${field} IN (${placeholders})`);
                params.push(...value);
            } else if (value === null) {
                whereParts.push(`${field} IS NULL`);
            } else {
                whereParts.push(`${field} = ?`);
                params.push(value);
            }
        });
        
        return {
            where: whereParts.join(' AND '),
            params
        };
    }

    /**
     * Filtra apenas campos permitidos
     * @param {Object} data - Dados a serem filtrados
     * @returns {Object}
     */
    filterFillable(data) {
        if (this.fillable.length === 0) {
            return data;
        }
        
        const filtered = {};
        this.fillable.forEach(field => {
            if (data.hasOwnProperty(field)) {
                filtered[field] = data[field];
            }
        });
        
        return filtered;
    }

    /**
     * Oculta campos sensíveis
     * @param {Object} data - Dados a serem filtrados
     * @returns {Object}
     */
    hideFields(data) {
        if (this.hidden.length === 0) {
            return data;
        }
        
        const filtered = { ...data };
        this.hidden.forEach(field => {
            delete filtered[field];
        });
        
        return filtered;
    }

    /**
     * Valida dados do modelo
     * @param {Object} data - Dados a serem validados
     * @param {number|string} id - ID do registro (para atualizações)
     * @returns {Promise<void>}
     */
    async validate(data, id = null) {
        // Implementação básica - pode ser sobrescrita nas classes filhas
        const errors = [];
        
        // Validações básicas baseadas nas regras
        for (const [field, rules] of Object.entries(this.rules)) {
            const value = data[field];
            
            if (rules.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field} é obrigatório`);
                continue;
            }
            
            if (value !== undefined && value !== null && value !== '') {
                if (rules.maxLength && String(value).length > rules.maxLength) {
                    errors.push(`${field} deve ter no máximo ${rules.maxLength} caracteres`);
                }
                
                if (rules.minLength && String(value).length < rules.minLength) {
                    errors.push(`${field} deve ter no mínimo ${rules.minLength} caracteres`);
                }
                
                if (rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    errors.push(`${field} deve ser um email válido`);
                }
            }
        }
        
        if (errors.length > 0) {
            throw new Error(`Erro de validação: ${errors.join(', ')}`);
        }
    }
}

module.exports = BaseModel;