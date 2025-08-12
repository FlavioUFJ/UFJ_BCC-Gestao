# Correção do Erro de Sintaxe no ecosystem.config.js

## Problema Identificado
O arquivo `ecosystem.config.js` em produção está com erro de sintaxe na linha 20:
```
SyntaxError: Unexpected identifier 'autorestart'
```

## Causa
Falta da propriedade `exec_mode` após `instances: 1`, causando erro de sintaxe.

## Solução

### Opção 1: Editar diretamente no servidor
No servidor de produção, edite o arquivo `/opt/nodejs/apps/coordenai_bccufj/ecosystem.config.js` e adicione a linha:

```javascript
module.exports = {
  apps: [{
    name: 'gestao-bcc-ufj',
    script: 'server.js',
    cwd: '/opt/nodejs/apps/gestao-bcc',
    instances: 1,
    exec_mode: 'fork',  // <- ADICIONAR ESTA LINHA
    autorestart: true,
    // ... resto da configuração
  }]
};
```

### Opção 2: Recriar o arquivo
Delete o arquivo atual e recrie baseado no `ecosystem.config.example.js` deste repositório.

### Comandos para aplicar a correção:
```bash
# No servidor de produção:
cd /opt/nodejs/apps/coordenai_bccufj

# Backup do arquivo atual
cp ecosystem.config.js ecosystem.config.js.backup

# Editar o arquivo (usando nano ou vi)
nano ecosystem.config.js

# Validar a sintaxe
node -c ecosystem.config.js

# Reiniciar o PM2
pm2 reload ecosystem.config.js
```

## Arquivo Corrigido Completo
```javascript
module.exports = {
  apps: [{
    name: 'gestao-bcc-ufj',
    script: 'server.js',
    cwd: '/opt/nodejs/apps/gestao-bcc',
    instances: 1,
    exec_mode: 'fork',
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
    node_args: '--max-old-space-size=1024'
  }]
};
```

## Verificação
Após a correção, execute:
```bash
node -c ecosystem.config.js
pm2 reload ecosystem.config.js
pm2 status
```

Se não houver erros, a aplicação deve reiniciar corretamente.