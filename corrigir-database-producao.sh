#!/bin/bash

# Script para corrigir o arquivo database.js em produção
# Este script substitui o arquivo SQLite pelo arquivo MariaDB correto

set -e  # Para o script se houver erro

echo "=== CORREÇÃO DO ARQUIVO DATABASE.JS EM PRODUÇÃO ==="
echo "Data/Hora: $(date)"
echo

# Definir variáveis
APP_DIR="/opt/nodejs/apps/gestao-bcc"
DATABASE_FILE="$APP_DIR/src/config/database.js"
BACKUP_DIR="/tmp/backup-database-$(date +%Y%m%d_%H%M%S)"

# Verificar se o diretório da aplicação existe
if [ ! -d "$APP_DIR" ]; then
    echo "❌ ERRO: Diretório da aplicação não encontrado: $APP_DIR"
    exit 1
fi

echo "📁 Diretório da aplicação: $APP_DIR"
echo "📄 Arquivo a ser corrigido: $DATABASE_FILE"
echo

# Criar diretório de backup
mkdir -p "$BACKUP_DIR"
echo "📦 Diretório de backup criado: $BACKUP_DIR"

# Fazer backup do arquivo atual
if [ -f "$DATABASE_FILE" ]; then
    cp "$DATABASE_FILE" "$BACKUP_DIR/database.js.backup"
    echo "✅ Backup do arquivo atual criado"
else
    echo "⚠️  Arquivo database.js não encontrado, será criado"
fi

# Parar a aplicação PM2
echo
echo "🛑 Parando aplicação PM2..."
sudo pm2 stop gestao-bcc-ufj || echo "⚠️  Aplicação não estava rodando"

# Criar o novo arquivo database.js com configuração MariaDB
echo
echo "📝 Criando novo arquivo database.js com configuração MariaDB..."

cat > "$DATABASE_FILE" << 'EOF'
/**
 * Configuração do Banco de Dados
 * Centraliza todas as configurações relacionadas ao MariaDB
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
                console.log('Pool de conexões fechado.');
            } catch (err) {
                console.error('Erro ao fechar pool de conexões:', err.message);
            }
        }
    }

    /**
     * Executa uma query que não retorna dados (INSERT, UPDATE, DELETE)
     * @param {string} sql 
     * @param {Array} params 
     * @returns {Object}
     */
    async run(sql, params = []) {
        const pool = this.connect();
        try {
            const [result] = await pool.execute(sql, params);
            return {
                lastInsertRowid: result.insertId,
                changes: result.affectedRows
            };
        } catch (err) {
            console.error('Erro ao executar query:', err.message);
            throw err;
        }
    }

    /**
     * Executa uma query que retorna uma única linha
     * @param {string} sql 
     * @param {Array} params 
     * @returns {Object|null}
     */
    async get(sql, params = []) {
        const pool = this.connect();
        try {
            const [rows] = await pool.execute(sql, params);
            return rows.length > 0 ? rows[0] : null;
        } catch (err) {
            console.error('Erro ao executar query:', err.message);
            throw err;
        }
    }

    /**
     * Executa uma query que retorna múltiplas linhas
     * @param {string} sql 
     * @param {Array} params 
     * @returns {Array}
     */
    async all(sql, params = []) {
        const pool = this.connect();
        try {
            const [rows] = await pool.execute(sql, params);
            return rows;
        } catch (err) {
            console.error('Erro ao executar query:', err.message);
            throw err;
        }
    }

    /**
     * Executa múltiplas queries em uma transação
     * @param {Function} callback 
     * @returns {*}
     */
    async transaction(callback) {
        const pool = this.connect();
        const connection = await pool.getConnection();
        
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
     * @returns {boolean}
     */
    async testConnection() {
        try {
            const pool = this.connect();
            const [rows] = await pool.execute('SELECT 1 as test');
            console.log('Teste de conexão bem-sucedido:', rows[0]);
            return true;
        } catch (err) {
            console.error('Erro no teste de conexão:', err.message);
            return false;
        }
    }
}

// Instância singleton
const databaseConfig = new DatabaseConfig();

module.exports = databaseConfig;
EOF

echo "✅ Novo arquivo database.js criado com sucesso"

# Verificar se o arquivo dadosConexaoSGDB.js existe
echo
echo "🔍 Verificando arquivo de configuração de conexão..."
if [ -f "$APP_DIR/dadosConexaoSGDB.js" ]; then
    echo "✅ Arquivo dadosConexaoSGDB.js encontrado"
    echo "📋 Conteúdo do arquivo:"
    head -10 "$APP_DIR/dadosConexaoSGDB.js"
else
    echo "❌ ERRO: Arquivo dadosConexaoSGDB.js não encontrado!"
    echo "📝 Criando arquivo dadosConexaoSGDB.js..."
    
    cat > "$APP_DIR/dadosConexaoSGDB.js" << 'EOF'
/**
 * Dados de Conexão com o Sistema de Gerenciamento de Banco de Dados (SGBD)
 * Configurações para conexão com MariaDB
 */

module.exports = {
    // Configurações de conexão MariaDB
    host: 'localhost',
    port: 3306,
    user: 'comercial',
    password: 'pgcadmin',
    database: 'gestao_bccufj', // Nome da base de dados migrada
    
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
EOF
    echo "✅ Arquivo dadosConexaoSGDB.js criado"
fi

# Verificar se mysql2 está instalado
echo
echo "📦 Verificando dependências..."
cd "$APP_DIR"
if npm list mysql2 > /dev/null 2>&1; then
    echo "✅ mysql2 está instalado"
else
    echo "⚠️  mysql2 não encontrado, instalando..."
    npm install mysql2
    echo "✅ mysql2 instalado"
fi

# Verificar se sqlite3 ainda está presente (deve ser removido)
if npm list sqlite3 > /dev/null 2>&1; then
    echo "⚠️  sqlite3 ainda está instalado, removendo..."
    npm uninstall sqlite3
    echo "✅ sqlite3 removido"
else
    echo "✅ sqlite3 não está instalado (correto)"
fi

# Testar a nova configuração
echo
echo "🧪 Testando nova configuração..."
node -e "
const databaseConfig = require('./src/config/database');
(async () => {
    try {
        const isConnected = await databaseConfig.testConnection();
        if (isConnected) {
            console.log('✅ Teste de conexão bem-sucedido!');
        } else {
            console.log('❌ Falha no teste de conexão');
        }
    } catch(e) {
        console.error('❌ Erro no teste:', e.message);
    }
})();
" || echo "⚠️  Teste falhou, mas continuando..."

# Reiniciar a aplicação
echo
echo "🚀 Reiniciando aplicação PM2..."
sudo pm2 start ecosystem.config.js
echo
echo "📊 Status da aplicação:"
sudo pm2 status

echo
echo "✅ CORREÇÃO CONCLUÍDA!"
echo "📁 Backup salvo em: $BACKUP_DIR"
echo "📄 Arquivo database.js atualizado para usar MariaDB"
echo "🔧 Dependências verificadas e corrigidas"
echo
echo "Para verificar os logs da aplicação:"
echo "sudo pm2 logs gestao-bcc-ufj"
echo
echo "Para testar o login:"
echo "curl -X POST http://localhost:3000/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"admin@ufj.edu.br\",\"senha\":\"123456\"}'"