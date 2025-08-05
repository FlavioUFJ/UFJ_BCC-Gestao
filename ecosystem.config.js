module.exports = {
  apps: [{
    name: 'ufj-bcc-gestao',
    script: 'server.js',
    cwd: '/var/www/html/gestao',
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
    log_file: '/home/ubuntu/logs/ufj-bcc-gestao.log',
    out_file: '/home/ubuntu/logs/ufj-bcc-gestao-out.log',
    error_file: '/home/ubuntu/logs/ufj-bcc-gestao-error.log',
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