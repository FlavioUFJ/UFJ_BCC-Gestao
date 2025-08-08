/**
 * Configuração PM2 para Produção
 * 
 * INSTRUÇÕES:
 * 1. Copie este arquivo para 'ecosystem.config.js'
 * 2. Ajuste as configurações conforme necessário
 * 3. NUNCA commite o arquivo 'ecosystem.config.js' no Git
 */

module.exports = {
  apps: [{
    // Configurações básicas da aplicação
    name: 'gestao-bcc-ufj',
    script: 'server.js',
    cwd: '/opt/nodejs/apps/gestao-bcc',
    
    // Configurações de ambiente
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Configurações de processo
    instances: 1,  // Número de instâncias (1 para aplicações com sessão)
    exec_mode: 'fork',  // Modo de execução
    
    // Configurações de monitoramento
    max_memory_restart: '500M',  // Reinicia se usar mais que 500MB
    
    // Configurações de logs
    log_file: '/opt/nodejs/apps/gestao-bcc/logs/pm2-combined.log',
    out_file: '/opt/nodejs/apps/gestao-bcc/logs/pm2-out.log',
    error_file: '/opt/nodejs/apps/gestao-bcc/logs/pm2-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Configurações de reinicialização
    autorestart: true,
    watch: false,  // Não usar watch em produção
    max_restarts: 10,
    min_uptime: '10s',
    
    // Configurações de inicialização
    wait_ready: true,
    listen_timeout: 10000,
    kill_timeout: 5000,
    
    // Configurações avançadas
    node_args: '--max-old-space-size=512',  // Limite de memória Node.js
    
    // Configurações de merge de logs
    merge_logs: true,
    
    // Configurações de tempo
    time: true
  }],
  
  // Configurações de deploy (opcional)
  deploy: {
    production: {
      user: 'nodejs',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'https://github.com/FlavioUFJ/UFJ_BCC-Gestao.git',
      path: '/opt/nodejs/apps/gestao-bcc',
      'post-deploy': 'npm install --production && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};