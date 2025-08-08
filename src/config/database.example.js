/**
 * Configuração do Banco de Dados - ARQUIVO EXEMPLO
 * 
 * INSTRUÇÕES:
 * 1. Copie este arquivo para 'database.js'
 * 2. Certifique-se de que o arquivo 'dadosConexaoSGDB.js' está configurado
 * 3. NUNCA commite o arquivo 'database.js' no Git
 * 
 * Este arquivo centraliza todas as configurações relacionadas ao MariaDB
 */

const mysql = require('mysql2/promise');
const dadosConexao = require('../../dadosConexaoSGDB');

class DatabaseConfig {
    constructor() {
        this.pool = null;
        this.config = dadosConexao;
    }

    /**
     * Conecta ao banco de dados
     * @returns {mysql.Pool}
     */
    connect() {
        if (!this.pool) {
            try {
                this.pool = mysql.createPool(this.config);
                console.log('Pool de conexões MariaDB criado com sucesso.');
            } catch (err) {
                console.error('Erro ao criar pool de conexões:', err.message);
                throw err;
            }
        }
        return this.pool;
    }

    /**
     * Fecha a conexão com o banco de dados
     */
    async close() {
        if (this.pool) {
            try {
                await this.pool.end();
                console.log('Pool de conexões MariaDB fechado.');
                this.pool = null;
            } catch (err) {
                console.error('Erro ao fechar pool de conexões:', err.message);
            }
        }
    }

    /**
     * Executa uma query de forma promisificada
     * @param {string} sql - Query SQL
     * @param {Array} params - Parâmetros da query
     * @returns {Promise<Object>} Resultado da query
     */
    async run(sql, params = []) {
        const connection = this.connect();
        try {
            const [result] = await connection.execute(sql, params);
            return result;
        } catch (err) {
            console.error('Erro ao executar query:', err.message);
            throw err;
        }
    }

    /**
     * Executa uma query e retorna apenas o primeiro resultado
     * @param {string} sql - Query SQL
     * @param {Array} params - Parâmetros da query
     * @returns {Promise<Object|null>} Primeiro resultado ou null
     */
    async get(sql, params = []) {
        const connection = this.connect();
        try {
            const [rows] = await connection.execute(sql, params);
            return rows.length > 0 ? rows[0] : null;
        } catch (err) {
            console.error('Erro ao executar query get:', err.message);
            throw err;
        }
    }

    /**
     * Executa uma query e retorna todos os resultados
     * @param {string} sql - Query SQL
     * @param {Array} params - Parâmetros da query
     * @returns {Promise<Array>} Array com todos os resultados
     */
    async all(sql, params = []) {
        const connection = this.connect();
        try {
            const [rows] = await connection.execute(sql, params);
            return rows;
        } catch (err) {
            console.error('Erro ao executar query all:', err.message);
            throw err;
        }
    }

    /**
     * Executa múltiplas queries em uma transação
     * @param {Function} callback - Função que recebe a conexão como parâmetro
     * @returns {Promise<any>} Resultado da transação
     */
    async transaction(callback) {
        const connection = await this.connect().getConnection();
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (err) {
            await connection.rollback();
            console.error('Erro na transação:', err.message);
            throw err;
        } finally {
            connection.release();
        }
    }

    /**
     * Testa a conexão com o banco de dados
     * @returns {Promise<boolean>} True se a conexão foi bem-sucedida
     */
    async testConnection() {
        try {
            const connection = this.connect();
            await connection.execute('SELECT 1');
            console.log('Conexão com o banco de dados testada com sucesso.');
            return true;
        } catch (err) {
            console.error('Erro ao testar conexão:', err.message);
            return false;
        }
    }
}

// Exporta uma instância única (singleton)
const databaseConfig = new DatabaseConfig();

module.exports = databaseConfig;