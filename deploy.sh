#!/bin/bash

# Script de Deploy Automatizado para Oracle Cloud Ubuntu
# UFJ BCC-Gestão

set -e  # Parar execução em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Verificar se está rodando como ubuntu
if [ "$USER" != "ubuntu" ]; then
    error "Este script deve ser executado como usuário ubuntu"
fi

# Diretório da aplicação
APP_DIR="/home/ubuntu/UFJ_BCC-Gestao"
APP_NAME="ufj-bcc-gestao"

log "Iniciando deploy da aplicação UFJ BCC-Gestão..."

# 1. Atualizar código do repositório
log "Atualizando código do repositório..."
cd $APP_DIR
git pull origin dev || error "Falha ao atualizar código do repositório"

# 2. Fazer backup do banco de dados
log "Criando backup do banco de dados..."
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR
DATE=$(date +"%Y%m%d_%H%M%S")
if [ -f "$APP_DIR/database.db" ]; then
    cp $APP_DIR/database.db $BACKUP_DIR/database_backup_$DATE.db
    log "Backup criado: database_backup_$DATE.db"
else
    warn "Arquivo database.db não encontrado, pulando backup"
fi

# 3. Instalar/atualizar dependências
log "Instalando/atualizando dependências..."
npm install --production || error "Falha ao instalar dependências"

# 4. Verificar arquivo .env
if [ ! -f "$APP_DIR/.env" ]; then
    warn "Arquivo .env não encontrado. Criando arquivo de exemplo..."
    cat > $APP_DIR/.env << EOF
NODE_ENV=production
PORT=3000
SESSION_SECRET=ALTERE_ESTA_CHAVE_SECRETA_MUITO_FORTE
DB_PATH=./database.db

# Configurações de Email (opcional)
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=seu_email@gmail.com
# EMAIL_PASS=sua_senha_de_app
# EMAIL_FROM=seu_email@gmail.com
EOF
    error "Arquivo .env criado. Por favor, configure as variáveis e execute o script novamente."
fi

# 5. Verificar permissões do banco de dados
if [ -f "$APP_DIR/database.db" ]; then
    log "Configurando permissões do banco de dados..."
    chown ubuntu:ubuntu $APP_DIR/database.db
    chmod 664 $APP_DIR/database.db
fi

# 6. Testar a aplicação
log "Testando configuração da aplicação..."
timeout 10s node server.js > /dev/null 2>&1 || warn "Teste da aplicação falhou ou demorou mais que 10 segundos"

# 7. Gerenciar PM2
log "Gerenciando processo PM2..."
if pm2 describe $APP_NAME > /dev/null 2>&1; then
    log "Reiniciando aplicação existente..."
    pm2 restart $APP_NAME
else
    log "Iniciando nova aplicação..."
    pm2 start ecosystem.config.js
fi

# 8. Salvar configuração PM2
pm2 save

# 9. Verificar status da aplicação
log "Verificando status da aplicação..."
sleep 3
if pm2 describe $APP_NAME | grep -q "online"; then
    log "✅ Aplicação está online!"
else
    error "❌ Aplicação não está online. Verifique os logs com: pm2 logs $APP_NAME"
fi

# 10. Testar Nginx (se estiver instalado)
if command -v nginx > /dev/null 2>&1; then
    log "Testando configuração do Nginx..."
    sudo nginx -t && log "✅ Configuração do Nginx OK" || warn "⚠️  Problema na configuração do Nginx"
fi

# 11. Limpeza de backups antigos (manter apenas 7 dias)
log "Limpando backups antigos..."
find $BACKUP_DIR -name "database_backup_*.db" -type f -mtime +7 -delete 2>/dev/null || true

# 12. Mostrar informações finais
log "Deploy concluído com sucesso! 🎉"
info "Aplicação: $APP_NAME"
info "Status: $(pm2 describe $APP_NAME | grep 'status' | head -1)"
info "URL: http://$(curl -s ifconfig.me):3000 (se não estiver usando Nginx)"
info "Logs: pm2 logs $APP_NAME"
info "Monitoramento: pm2 monit"

log "Para verificar se tudo está funcionando, acesse a aplicação no navegador."
log "Em caso de problemas, verifique os logs com: pm2 logs $APP_NAME"