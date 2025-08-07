module.exports = {
  apps: [{
    name: 'gestao-bcc-ufj',
    script: 'server.js',
    cwd: '/opt/nodejs/apps/gestao-bcc',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Configurações de log
    log_file: '/opt/nodejs/apps/gestao-bcc/logs/gestao-bcc-ufj.log',
    out_file: '/opt/nodejs/apps/gestao-bcc/logs/gestao-bcc-ufj-out.log',
    error_file: '/opt/nodejs/apps/gestao-bcc/logs/gestao-bcc-ufj-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Configurações de restart
    min_uptime: '10s',
    max_restarts: 10,
    
    // Configurações de recursos
    node_args: '--max-old-space-size=1024',
    
    // Configurações de cluster (se necessário no futuro)
    // instances: 'max',
    // exec_mode: 'cluster'
  }]
};