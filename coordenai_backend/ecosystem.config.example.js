/**
 * Configuração PM2 do backend CoordenAI.
 * Copie para `ecosystem.config.js` e ajuste os caminhos.
 *
 * Atualizar somente o backend:  pm2 reload coordenai-backend
 * (o frontend é estático e não depende deste processo para ser publicado)
 */

module.exports = {
  apps: [{
    name: 'coordenai-backend',
    script: 'server.js',
    cwd: '/opt/nodejs/apps/coordenai_backend',

    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },

    // Uma instância: os tokens de redefinição de senha ficam em memória
    instances: 1,
    exec_mode: 'fork',

    max_memory_restart: '700M',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',

    wait_ready: true,
    listen_timeout: 10000,
    kill_timeout: 5000,

    out_file: './logs/pm2-out.log',
    error_file: './logs/pm2-error.log',
    merge_logs: true,
    time: true
  }]
};
