/**
 * Modelo de Estágio
 * Modelo básico para manter compatibilidade após remoção do campo_estagio
 */

const BaseModel = require('./BaseModel');

class Estagio extends BaseModel {
    constructor() {
        super('estagio'); // Tabela fictícia - funcionalidade removida
    }

    /**
     * Busca estágio por ID com detalhes
     * @param {number} id - ID do estágio
     * @returns {Promise<Object|null>}
     */
    async findByIdWithDetails(id) {
        // Funcionalidade removida - retorna null
        return null;
    }

    /**
     * Cria um novo estágio
     * @param {Object} dados - Dados do estágio
     * @returns {Promise<Object>}
     */
    async create(dados) {
        // Funcionalidade removida - retorna objeto vazio
        return { id: null, message: 'Funcionalidade de estágio removida' };
    }

    /**
     * Atualiza um estágio
     * @param {number} id - ID do estágio
     * @param {Object} dados - Dados para atualização
     * @returns {Promise<Object>}
     */
    async update(id, dados) {
        // Funcionalidade removida - retorna objeto vazio
        return { id, message: 'Funcionalidade de estágio removida' };
    }

    /**
     * Atualiza status do estágio
     * @param {number} id - ID do estágio
     * @param {string} status - Novo status
     * @returns {Promise<Object>}
     */
    async updateStatus(id, status) {
        // Funcionalidade removida - retorna objeto vazio
        return { id, status, message: 'Funcionalidade de estágio removida' };
    }

    /**
     * Busca estágio por ID
     * @param {number} id - ID do estágio
     * @returns {Promise<Object|null>}
     */
    async findById(id) {
        // Funcionalidade removida - retorna null
        return null;
    }

    /**
     * Valida dados do estágio
     * @param {Object} dados - Dados a serem validados
     * @param {number} id - ID do estágio (para atualizações)
     * @returns {Promise<void>}
     */
    async validate(dados, id = null) {
        // Funcionalidade removida - não faz validação
        return;
    }

    /**
     * Busca estatísticas gerais
     * @returns {Promise<Object>}
     */
    async getEstatisticas() {
        // Funcionalidade removida - retorna estatísticas vazias
        return {
            total: 0,
            ativos: 0,
            concluidos: 0,
            cancelados: 0
        };
    }

    /**
     * Busca estágios por estagiário
     * @param {number} idEstagiario - ID do estagiário
     * @returns {Promise<Array>}
     */
    async findByEstagiario(idEstagiario) {
        // Funcionalidade removida - retorna array vazio
        return [];
    }

    /**
     * Busca estágios por orientador
     * @param {number} idOrientador - ID do orientador
     * @returns {Promise<Array>}
     */
    async findByOrientador(idOrientador) {
        // Funcionalidade removida - retorna array vazio
        return [];
    }

    /**
     * Busca estágios por empresa
     * @param {number} idEmpresa - ID da empresa
     * @returns {Promise<Array>}
     */
    async findByEmpresa(idEmpresa) {
        // Funcionalidade removida - retorna array vazio
        return [];
    }

    /**
     * Busca todos os estágios com detalhes
     * @returns {Promise<Array>}
     */
    async findWithDetails() {
        // Funcionalidade removida - retorna array vazio
        return [];
    }
}

module.exports = Estagio;