/**
 * Dados de conexão com o MariaDB/MySQL, lidos de variáveis de ambiente.
 *
 * Substitui o antigo `dadosConexaoSGDB.js` (arquivo fora do Git com as
 * credenciais em texto). Configure as variáveis DB_* no arquivo `.env`.
 */

require('dotenv').config();

const inteiro = (valor, padrao) => {
    const n = parseInt(valor, 10);
    return Number.isFinite(n) ? n : padrao;
};

module.exports = {
    host: process.env.DB_HOST || 'localhost',
    port: inteiro(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestao_bccufj',

    // Pool de conexões
    connectionLimit: inteiro(process.env.DB_CONNECTION_LIMIT, 10),
    idleTimeout: inteiro(process.env.DB_IDLE_TIMEOUT, 60000),

    // MySQL/MariaDB
    charset: 'utf8mb4',
    timezone: 'local',
    dateStrings: false,
    ssl: process.env.DB_SSL === 'true' ? {} : false
};
