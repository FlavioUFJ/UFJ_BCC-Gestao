# Configurações Recomendadas para Produção

## Problema Identificado

O erro "Latin connection aguarde 15 minutos" está relacionado ao **rate limiting** configurado na aplicação. Foram identificados os seguintes limitadores:

### 1. Rate Limiting Global (app.js linha 134-143)
```javascript
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: this.environment === 'production' ? 100 : 1000, // ⚠️ MUITO BAIXO para produção
    message: {
        error: 'Muitas tentativas. Tente novamente em 15 minutos.',
        code: 'RATE_LIMIT_EXCEEDED'
    }
});
```

### 2. Pool de Conexões Limitado (dadosConexaoSGDB.js)
```javascript
connectionLimit: 10, // ⚠️ Muito baixo para múltiplos usuários simultâneos
idleTimeout: 60000,  // 60 segundos
```

### 3. Configuração PM2 (ecosystem.config.js)
```javascript
instances: 1,  // ⚠️ Apenas 1 instância
exec_mode: 'fork',
max_memory_restart: '500M'
```

## Soluções Recomendadas

### 1. Ajustar Rate Limiting para Produção

**Arquivo: `app.js` (linha ~134)**
```javascript
// Rate limiting mais permissivo para produção
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: this.environment === 'production' ? 500 : 1000, // Aumentar para 500
    message: {
        error: 'Muitas tentativas. Tente novamente em 15 minutos.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Adicionar skip para IPs confiáveis
    skip: (req) => {
        // Lista de IPs confiáveis (opcional)
        const trustedIPs = ['127.0.0.1', '::1'];
        return trustedIPs.includes(req.ip);
    }
});
```

### 2. Otimizar Pool de Conexões

**Arquivo: `dadosConexaoSGDB.js`**
```javascript
module.exports = {
    host: 'localhost',
    port: 3306,
    user: 'seu_usuario_aqui',
    password: 'sua_senha_aqui',
    database: 'gestao_bccufj',
    
    // Pool de conexões otimizado para produção
    connectionLimit: 50,        // Aumentar para 50 conexões
    acquireTimeout: 60000,      // 60s timeout para obter conexão
    timeout: 60000,             // 60s timeout para queries
    reconnect: true,            // Reconectar automaticamente
    idleTimeout: 300000,        // 5 minutos de idle
    queueLimit: 100,            // Fila de até 100 requisições
    
    // Configurações específicas do MySQL/MariaDB
    charset: 'utf8mb4',
    timezone: 'local',
    dateStrings: false,
    ssl: false,
    
    // Configurações adicionais para estabilidade
    multipleStatements: false,
    supportBigNumbers: true,
    bigNumberStrings: true
};
```

### 3. Configurar PM2 para Múltiplas Instâncias

**Arquivo: `ecosystem.config.js`**
```javascript
module.exports = {
  apps: [{
    name: 'gestao-bcc-ufj',
    script: 'server.js',
    cwd: '/opt/nodejs/apps/gestao-bcc',
    
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Configurações otimizadas para produção
    instances: 2,              // Aumentar para 2-4 instâncias
    exec_mode: 'cluster',      // Usar modo cluster
    
    // Monitoramento
    max_memory_restart: '1G',  // Aumentar limite de memória
    
    // Logs
    log_file: '/opt/nodejs/apps/gestao-bcc/logs/pm2-combined.log',
    out_file: '/opt/nodejs/apps/gestao-bcc/logs/pm2-out.log',
    error_file: '/opt/nodejs/apps/gestao-bcc/logs/pm2-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Reinicialização
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Inicialização
    wait_ready: true,
    listen_timeout: 30000,     // Aumentar timeout
    kill_timeout: 10000,
    
    // Node.js
    node_args: '--max-old-space-size=1024'  // Aumentar memória
  }]
};
```

### 4. Configurações Adicionais de Sessão

**Arquivo: `src/config/session.js` (linha ~22)**
```javascript
const sessionStore = new MySQLStore({
    host: dadosConexao.host,
    port: dadosConexao.port,
    user: dadosConexao.user,
    password: dadosConexao.password,
    database: dadosConexao.database,
    clearExpired: true,
    checkExpirationInterval: 900000, // 15 minutos
    expiration: 86400000, // 24 horas
    createDatabaseTable: true,
    charset: 'utf8mb4_bin',
    
    // Configurações adicionais para produção
    connectionLimit: 10,        // Pool dedicado para sessões
    acquireTimeout: 30000,      // 30s timeout
    reconnect: true,
    
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
});
```

## Implementação Gradual

### Fase 1 - Emergencial (Implementar Imediatamente)
1. **Aumentar rate limit** de 100 para 500 requisições por 15 minutos
2. **Aumentar connectionLimit** de 10 para 30 conexões

### Fase 2 - Otimização (Próxima Manutenção)
1. Configurar PM2 com múltiplas instâncias
2. Implementar pool de conexões otimizado
3. Adicionar monitoramento de performance

### Fase 3 - Monitoramento
1. Implementar logs detalhados de conexões
2. Configurar alertas de performance
3. Análise de métricas de uso

## Comandos para Aplicar

```bash
# 1. Parar aplicação
pm2 stop gestao-bcc-ufj

# 2. Aplicar configurações
# (editar arquivos conforme documentado acima)

# 3. Reiniciar aplicação
pm2 start ecosystem.config.js

# 4. Monitorar logs
pm2 logs gestao-bcc-ufj

# 5. Verificar status
pm2 status
```

## Monitoramento Pós-Implementação

```bash
# Verificar conexões ativas no MySQL
SHOW PROCESSLIST;

# Verificar status das variáveis de conexão
SHOW STATUS LIKE 'Connections';
SHOW STATUS LIKE 'Max_used_connections';

# Monitorar logs da aplicação
tail -f /opt/nodejs/apps/gestao-bcc/logs/pm2-combined.log
```

## Observações Importantes

1. **Sessões**: A aplicação usa sessões em banco, então múltiplas instâncias PM2 compartilharão o mesmo store
2. **Rate Limiting**: O limite atual de 100 req/15min é muito baixo para uso real em produção
3. **Pool de Conexões**: 10 conexões simultâneas é insuficiente para múltiplos usuários
4. **Memória**: Limite de 500MB pode ser baixo dependendo do uso

Essas configurações devem resolver o problema de "Latin connection aguarde 15 minutos" e melhorar significativamente a capacidade da aplicação de lidar com múltiplos usuários simultâneos.