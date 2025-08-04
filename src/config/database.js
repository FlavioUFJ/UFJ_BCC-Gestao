/**
 * Configuração do Banco de Dados
 * Centraliza todas as configurações relacionadas ao SQLite
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseConfig {
    constructor() {
        this.dbPath = path.join(__dirname, '../../database.db');
        this.db = null;
    }

    /**
     * Conecta ao banco de dados
     * @returns {sqlite3.Database}
     */
    connect() {
        if (!this.db) {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Erro ao conectar com o banco de dados:', err.message);
                    throw err;
                } else {
                    console.log('Conectado ao banco de dados SQLite.');
                    // Habilitar foreign keys
                    this.db.run('PRAGMA foreign_keys = ON');
                }
            });
        }
        return this.db;
    }

    /**
     * Fecha a conexão com o banco de dados
     */
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Erro ao fechar o banco de dados:', err.message);
                } else {
                    console.log('Conexão com o banco de dados fechada.');
                }
            });
            this.db = null;
        }
    }

    /**
     * Executa uma query de forma promisificada
     * @param {string} sql - Query SQL
     * @param {Array} params - Parâmetros da query
     * @returns {Promise}
     */
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.connect().run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    /**
     * Executa uma query SELECT retornando um registro
     * @param {string} sql - Query SQL
     * @param {Array} params - Parâmetros da query
     * @returns {Promise}
     */
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.connect().get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    /**
     * Executa uma query SELECT retornando múltiplos registros
     * @param {string} sql - Query SQL
     * @param {Array} params - Parâmetros da query
     * @returns {Promise}
     */
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.connect().all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Executa múltiplas queries em uma transação
     * @param {Function} callback - Função que contém as queries
     * @returns {Promise}
     */
    transaction(callback) {
        return new Promise((resolve, reject) => {
            const db = this.connect();
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                
                try {
                    callback(db);
                    db.run('COMMIT', (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                } catch (error) {
                    db.run('ROLLBACK');
                    reject(error);
                }
            });
        });
    }
}

// Singleton instance
const databaseConfig = new DatabaseConfig();

module.exports = databaseConfig;