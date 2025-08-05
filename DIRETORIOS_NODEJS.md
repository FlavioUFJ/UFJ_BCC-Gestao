# Melhores Práticas para Diretórios de Aplicações Node.js

## Opções de Diretórios Recomendados

### 1. `/opt/nodejs/` (Recomendado para Produção)
```bash
# Criar estrutura
sudo mkdir -p /opt/nodejs/gestao
sudo chown -R ubuntu:ubuntu /opt/nodejs/gestao
```

**Vantagens:**
- ✅ Padrão Linux para aplicações de terceiros
- ✅ Separado do sistema web (Apache/Nginx)
- ✅ Permissões mais flexíveis
- ✅ Fácil backup e manutenção
- ✅ Não interfere com outros serviços web

**Desvantagens:**
- ⚠️ Requer sudo para criação inicial

### 2. `/home/ubuntu/apps/` (Mais Permissivo)
```bash
# Criar estrutura
mkdir -p /home/ubuntu/apps/gestao
cd /home/ubuntu/apps/gestao
```

**Vantagens:**
- ✅ Não requer sudo
- ✅ Controle total do usuário
- ✅ Permissões simples
- ✅ Fácil desenvolvimento e teste

**Desvantagens:**
- ⚠️ Misturado com arquivos pessoais
- ⚠️ Pode ser perdido se usuário for removido

### 3. `/srv/nodejs/` (Alternativa Padrão)
```bash
# Criar estrutura
sudo mkdir -p /srv/nodejs/gestao
sudo chown -R ubuntu:ubuntu /srv/nodejs/gestao
```

**Vantagens:**
- ✅ Padrão FHS (Filesystem Hierarchy Standard)
- ✅ Específico para serviços
- ✅ Organizado e profissional

**Desvantagens:**
- ⚠️ Menos comum
- ⚠️ Requer sudo para criação

## Comparação com `/var/www/html/`

### Por que NÃO usar `/var/www/html/`:
- ❌ Destinado a arquivos estáticos (HTML, CSS, JS)
- ❌ Permissões restritivas (www-data)
- ❌ Mistura aplicações Node.js com conteúdo web
- ❌ Pode causar conflitos de segurança
- ❌ Não é a melhor prática para aplicações backend

### Estrutura Recomendada Final:
```
/opt/nodejs/
├── gestao/                 # Aplicação principal
│   ├── node_modules/
│   ├── src/
│   ├── package.json
│   ├── ecosystem.config.js
│   └── .env
├── logs/                   # Logs centralizados (opcional)
└── backups/               # Backups (opcional)
```

## Configuração de Permissões

### Para `/opt/nodejs/`:
```bash
# Criar e configurar
sudo mkdir -p /opt/nodejs/gestao
sudo chown -R ubuntu:ubuntu /opt/nodejs/gestao
sudo chmod -R 755 /opt/nodejs/gestao

# Verificar permissões
ls -la /opt/nodejs/
```

### Para `/home/ubuntu/apps/`:
```bash
# Criar (sem sudo)
mkdir -p /home/ubuntu/apps/gestao
cd /home/ubuntu/apps/gestao

# Permissões já estão corretas
ls -la /home/ubuntu/apps/
```

## Configuração do PM2

### Atualizar ecosystem.config.js:
```javascript
module.exports = {
  apps: [{
    name: 'ufj-bcc-gestao',
    script: 'server.js',
    cwd: '/opt/nodejs/gestao',  // ou /home/ubuntu/apps/gestao
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: '/opt/nodejs/gestao/logs/combined.log',
    out_file: '/opt/nodejs/gestao/logs/out.log',
    error_file: '/opt/nodejs/gestao/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z'
  }]
};
```

## Comandos de Migração

### Se já instalou em `/var/www/html/`:
```bash
# Parar aplicação
pm2 stop ufj-bcc-gestao
pm2 delete ufj-bcc-gestao

# Criar novo diretório
sudo mkdir -p /opt/nodejs/gestao
sudo chown -R ubuntu:ubuntu /opt/nodejs/gestao

# Mover aplicação
sudo mv /var/www/html/gestao/* /opt/nodejs/gestao/
sudo chown -R ubuntu:ubuntu /opt/nodejs/gestao

# Atualizar configuração PM2
cd /opt/nodejs/gestao
pm2 start ecosystem.config.js
pm2 save
```

## Backup e Manutenção

### Script de Backup:
```bash
#!/bin/bash
# backup-gestao.sh

APP_DIR="/opt/nodejs/gestao"
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Backup da aplicação
tar -czf $BACKUP_DIR/gestao_$DATE.tar.gz -C /opt/nodejs gestao

# Manter apenas os 5 backups mais recentes
ls -t $BACKUP_DIR/gestao_*.tar.gz | tail -n +6 | xargs -r rm

echo "Backup criado: $BACKUP_DIR/gestao_$DATE.tar.gz"
```

### Comandos de Manutenção:
```bash
# Atualizar aplicação
cd /opt/nodejs/gestao
git pull origin dev
npm install
pm2 restart ufj-bcc-gestao

# Verificar logs
pm2 logs ufj-bcc-gestao
tail -f /opt/nodejs/gestao/logs/error.log

# Monitorar recursos
pm2 monit
```

## Recomendação Final

**Para produção:** Use `/opt/nodejs/gestao`
- Mais profissional e organizado
- Segue padrões Linux
- Fácil de gerenciar e fazer backup

**Para desenvolvimento/teste:** Use `/home/ubuntu/apps/gestao`
- Mais simples e permissivo
- Não requer sudo
- Ideal para testes rápidos

Ambas as opções são muito superiores a `/var/www/html/` para aplicações Node.js com proxy reverso.