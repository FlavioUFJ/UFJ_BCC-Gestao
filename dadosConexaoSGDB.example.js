/**
 * Dados de Conexão com o Sistema de Gerenciamento de Banco de Dados (SGBD)
 * Configurações para conexão com MariaDB
 * 
 * INSTRUÇÕES:
 * 1. Copie este arquivo para 'dadosConexaoSGDB.js'
 * 2. Configure as credenciais corretas do seu banco de dados
 * 3. NUNCA commite o arquivo 'dadosConexaoSGDB.js' no Git
 */

module.exports = {
    // Configurações de conexão MariaDB
    host: 'localhost',
    port: 3306,
    user: 'seu_usuario_aqui',
    password: 'sua_senha_aqui',
    database: 'gestao_bccufj', // Nome da base de dados
    
    // Configurações adicionais do pool de conexões
    connectionLimit: 10,
    idleTimeout: 60000,
    
    // Configurações específicas do MySQL/MariaDB
    charset: 'utf8mb4',
    timezone: 'local',
    dateStrings: false,
    
    // Configurações de SSL (se necessário)
    ssl: false
};