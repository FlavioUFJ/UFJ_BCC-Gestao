const BaseModel = require('./BaseModel');
const databaseConfig = require('../config/database');

/**
 * Modelo para gerenciamento de parâmetros do sistema
 */
class Parametro extends BaseModel {
    constructor() {
        super('parametro', 'id_parametro');
    }

    /**
     * Busca parâmetro por identificador
     * @param {string} identificador - Identificador do parâmetro
     * @returns {Promise<Object|null>}
     */
    async findByIdentificador(identificador) {
        try {
            const query = `
                SELECT parametro.identificador 
                FROM parametro 
                WHERE parametro.identificador LIKE ?
            `;
            
            const result = await databaseConfig.get(query, [identificador]);
            return result || null;
        } catch (error) {
            console.error('Erro ao buscar parâmetro por identificador:', error);
            throw new Error('Erro ao buscar parâmetro');
        }
    }

    /**
     * Busca valores de um parâmetro
     * @param {number} parametroId - ID do parâmetro
     * @returns {Promise<Array>}
     */
    async findValores(parametroId) {
        try {
            const query = `
                SELECT * FROM parametrovalor 
                WHERE id_parametro = ?
                ORDER BY id_parametrovalor
            `;
            
            const result = await databaseConfig.all(query, [parametroId]);
            return result || [];
        } catch (error) {
            console.error('Erro ao buscar valores do parâmetro:', error);
            throw new Error('Erro ao buscar valores do parâmetro');
        }
    }

    /**
     * Busca parâmetro com seus valores por identificador
     * @param {string} identificador - Identificador do parâmetro
     * @returns {Promise<Array>}
     */
    async findWithValoresByIdentificador(identificador) {
        try {
            const query = `
                SELECT 
                    parametro.identificador, 
                    parametrovalor.identificadorvalor, 
                    parametrovalor.valor 
                FROM 
                    parametro 
                LEFT OUTER JOIN parametrovalor ON parametro.id_parametro = parametrovalor.id_parametro 
                WHERE parametro.identificador LIKE ?
            `;
            
            const result = await databaseConfig.all(query, [identificador]);
            return result || [];
        } catch (error) {
            console.error('Erro ao buscar parâmetro com valores:', error);
            throw new Error('Erro ao buscar parâmetro com valores');
        }
    }

    /**
     * Busca um valor específico de um parâmetro
     * @param {string} identificador - Identificador do parâmetro
     * @param {string} identificadorValor - Identificador do valor específico
     * @returns {Promise<Object|null>}
     */
    async findValorEspecifico(identificador, identificadorValor) {
        try {
            const query = `
                SELECT 
                    parametro.identificador, 
                    parametrovalor.identificadorvalor, 
                    parametrovalor.valor 
                FROM 
                    parametro 
                LEFT OUTER JOIN parametrovalor ON parametro.id_parametro = parametrovalor.id_parametro 
                WHERE 
                    parametro.identificador LIKE ? AND 
                    parametrovalor.identificadorvalor LIKE ?
            `;
            
            const result = await databaseConfig.get(query, [identificador, identificadorValor]);
            return result || null;
        } catch (error) {
            console.error('Erro ao buscar valor específico do parâmetro:', error);
            throw new Error('Erro ao buscar valor específico do parâmetro');
        }
    }

    /**
     * Cria um novo parâmetro
     * @param {Object} data - Dados do parâmetro
     * @returns {Promise<Object>}
     */
    async create(data) {
        try {
            const { identificador, descricao, modulo, quantidadevalor } = data;
            
            const query = `
                INSERT INTO parametro (identificador, descricao, modulo, quantidadevalor)
                VALUES (?, ?, ?, ?)
            `;
            
            const result = await databaseConfig.run(query, [
                identificador,
                descricao,
                modulo || null,
                quantidadevalor
            ]);
            
            return {
                id_parametro: result.lastID,
                identificador,
                descricao,
                modulo,
                quantidadevalor
            };
        } catch (error) {
            console.error('Erro ao criar parâmetro:', error);
            throw new Error('Erro ao criar parâmetro');
        }
    }

    /**
     * Atualiza um parâmetro
     * @param {number} id - ID do parâmetro
     * @param {Object} data - Dados para atualização
     * @returns {Promise<boolean>}
     */
    async update(id, data) {
        try {
            const { identificador, descricao, modulo, quantidadevalor } = data;
            
            const query = `
                UPDATE parametro 
                SET identificador = ?, descricao = ?, modulo = ?, quantidadevalor = ?
                WHERE id_parametro = ?
            `;
            
            const result = await databaseConfig.run(query, [
                identificador,
                descricao,
                modulo || null,
                quantidadevalor,
                id
            ]);
            
            return result.changes > 0;
        } catch (error) {
            console.error('Erro ao atualizar parâmetro:', error);
            throw new Error('Erro ao atualizar parâmetro');
        }
    }

    /**
     * Exclui um parâmetro e seus valores
     * @param {number} id - ID do parâmetro
     * @returns {Promise<boolean>}
     */
    async delete(id) {
        try {
            // Primeiro excluir os valores
            await databaseConfig.run('DELETE FROM parametrovalor WHERE id_parametro = ?', [id]);
            
            // Depois excluir o parâmetro
            const result = await databaseConfig.run('DELETE FROM parametro WHERE id_parametro = ?', [id]);
            
            return result.changes > 0;
        } catch (error) {
            console.error('Erro ao excluir parâmetro:', error);
            throw new Error('Erro ao excluir parâmetro');
        }
    }

    /**
     * Cria um valor para um parâmetro
     * @param {Object} data - Dados do valor
     * @returns {Promise<Object>}
     */
    async createValor(data) {
        try {
            const { parametroId, identificadorvalor, valor } = data;
            
            const query = `
                INSERT INTO parametrovalor (id_parametro, identificadorvalor, valor)
                VALUES (?, ?, ?)
            `;
            
            const result = await databaseConfig.run(query, [
                parametroId,
                identificadorvalor,
                valor || ''
            ]);
            
            return {
                id_parametrovalor: result.lastID,
                id_parametro: parametroId,
                identificadorvalor,
                valor
            };
        } catch (error) {
            console.error('Erro ao criar valor do parâmetro:', error);
            throw new Error('Erro ao criar valor do parâmetro');
        }
    }

    /**
     * Atualiza um valor de parâmetro
     * @param {number} id - ID do valor
     * @param {Object} data - Dados para atualização
     * @returns {Promise<boolean>}
     */
    async updateValor(id, data) {
        try {
            const { identificadorvalor, valor } = data;
            
            const query = `
                UPDATE parametrovalor 
                SET identificadorvalor = ?, valor = ?
                WHERE id_parametrovalor = ?
            `;
            
            const result = await databaseConfig.run(query, [
                identificadorvalor,
                valor || '',
                id
            ]);
            
            return result.changes > 0;
        } catch (error) {
            console.error('Erro ao atualizar valor do parâmetro:', error);
            throw new Error('Erro ao atualizar valor do parâmetro');
        }
    }

    /**
     * Exclui um valor de parâmetro
     * @param {number} id - ID do valor
     * @returns {Promise<boolean>}
     */
    async deleteValor(id) {
        try {
            const result = await databaseConfig.run('DELETE FROM parametrovalor WHERE id_parametrovalor = ?', [id]);
            return result.changes > 0;
        } catch (error) {
            console.error('Erro ao excluir valor do parâmetro:', error);
            throw new Error('Erro ao excluir valor do parâmetro');
        }
    }

    /**
     * Busca parâmetros por módulo
     * @param {string} modulo - Nome do módulo
     * @returns {Promise<Array>}
     */
    async findByModulo(modulo) {
        try {
            const query = `
                SELECT * FROM parametro 
                WHERE modulo = ?
            `;
            
            const result = await databaseConfig.all(query, [modulo]);
            return result || [];
        } catch (error) {
            console.error('Erro ao buscar parâmetros por módulo:', error);
            throw new Error('Erro ao buscar parâmetros por módulo');
        }
    }

    /**
     * Busca parâmetros por módulo com seus valores
     * @param {string} modulo - Nome do módulo
     * @returns {Promise<Array>}
     */
    async findByModuloWithValues(modulo) {
        try {
            const parametros = await this.findByModulo(modulo);
            
            if (!parametros || parametros.length === 0) {
                return [];
            }

            // Para cada parâmetro, buscar seus valores
            const parametrosComValores = await Promise.all(
                parametros.map(async (parametro) => {
                    const valores = await this.findValores(parametro.id_parametro);
                    return {
                        ...parametro,
                        valores: valores || []
                    };
                })
            );

            return parametrosComValores;
        } catch (error) {
            console.error('Erro ao buscar parâmetros por módulo com valores:', error);
            throw new Error('Erro ao buscar parâmetros por módulo com valores');
        }
    }

    /**
     * Busca todos os parâmetros com seus valores
     * @returns {Promise<Array>}
     */
    async findAllWithValues() {
        try {
            const parametros = await this.findAll();
            
            if (!parametros || parametros.length === 0) {
                return [];
            }

            // Para cada parâmetro, buscar seus valores
            const parametrosComValores = await Promise.all(
                parametros.map(async (parametro) => {
                    const valores = await this.findValores(parametro.id_parametro);
                    return {
                        ...parametro,
                        valores: valores || []
                    };
                })
            );

            return parametrosComValores;
        } catch (error) {
            console.error('Erro ao buscar parâmetros com valores:', error);
            throw new Error('Erro ao buscar parâmetros com valores');
        }
    }
}

module.exports = Parametro;