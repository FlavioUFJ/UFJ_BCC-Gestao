#!/bin/bash

# Script de Deploy para Servidor de Aplicação
# Este script faz deploy da aplicação no servidor, sobrescrevendo alterações locais
# Uso: ./deploy-servidor.sh [branch]

set -e  # Para o script se houver erro

# Configurações
APP_NAME="gestao-bcc-ufj"
APP_DIR="/opt/nodejs/apps/gestao-bcc"
REPO_URL="https://github.com/FlavioUFJ/UFJ_BCC-Gestao.git"
BRANCH="${1:-dev}"  # Branch padrão é 'dev', mas pode ser passado como parâmetro
BACKUP_DIR="/tmp/backup-deploy-$(date +%Y%m%d_%H%M%S)"
LOG_FILE="/var/log/deploy-gestao.log"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logging
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] ℹ️  $1${NC}" | tee -a "$LOG_FILE"
}

# Verificar se está rodando como root ou com sudo
if [ "$EUID" -ne 0 ]; then
    error "Este script deve ser executado como root ou com sudo"
fi

echo "====================================="
echo "    DEPLOY SERVIDOR DE APLICAÇÃO    "
echo "====================================="
echo ""
log "Iniciando deploy da branch: $BRANCH"
log "Diretório da aplicação: $APP_DIR"
log "Backup será salvo em: $BACKUP_DIR"
echo ""

# 1. Criar diretório de backup
log "📦 Criando backup do estado atual..."
mkdir -p "$BACKUP_DIR"

# 2. Parar a aplicação PM2
log "🛑 Parando aplicação PM2..."
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
    pm2 stop "$APP_NAME" || warn "Falha ao parar a aplicação"
    pm2 delete "$APP_NAME" || warn "Falha ao deletar processo PM2"
else
    warn "Aplicação não estava rodando no PM2"
fi

# 3. Backup dos arquivos de configuração importantes
log "💾 Fazendo backup de arquivos de configuração..."
if [ -f "$APP_DIR/.env" ]; then
    cp "$APP_DIR/.env" "$BACKUP_DIR/.env.backup"
    log "✅ Backup do .env criado"
fi

if [ -f "$APP_DIR/dadosConexaoSGDB.js" ]; then
    cp "$APP_DIR/dadosConexaoSGDB.js" "$BACKUP_DIR/dadosConexaoSGDB.js.backup"
    log "✅ Backup do dadosConexaoSGDB.js criado"
fi

if [ -f "$APP_DIR/ecosystem.config.js" ]; then
    cp "$APP_DIR/ecosystem.config.js" "$BACKUP_DIR/ecosystem.config.js.backup"
    log "✅ Backup do ecosystem.config.js criado"
fi

# 4. Verificar se o diretório existe, se não, clonar
if [ ! -d "$APP_DIR" ]; then
    log "📁 Diretório não existe, clonando repositório..."
    mkdir -p "$(dirname "$APP_DIR")"
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
    git checkout "$BRANCH"
else
    cd "$APP_DIR"
    
    # 5. Forçar atualização do repositório (sobrescrever alterações locais)
    log "🔄 Atualizando código do GitHub (sobrescrevendo alterações locais)..."
    
    # Resetar qualquer alteração local
    git reset --hard HEAD
    git clean -fd  # Remove arquivos não rastreados
    
    # Buscar atualizações do repositório
    git fetch origin
    
    # Mudar para a branch desejada e forçar atualização
    git checkout "$BRANCH"
    git reset --hard "origin/$BRANCH"
    
    log "✅ Código atualizado da branch $BRANCH"
fi

# 6. Restaurar arquivos de configuração
log "🔧 Restaurando arquivos de configuração..."
if [ -f "$BACKUP_DIR/.env.backup" ]; then
    cp "$BACKUP_DIR/.env.backup" "$APP_DIR/.env"
    log "✅ Arquivo .env restaurado"
fi

if [ -f "$BACKUP_DIR/dadosConexaoSGDB.js.backup" ]; then
    cp "$BACKUP_DIR/dadosConexaoSGDB.js.backup" "$APP_DIR/dadosConexaoSGDB.js"
    log "✅ Arquivo dadosConexaoSGDB.js restaurado"
else
    warn "Arquivo dadosConexaoSGDB.js não encontrado no backup"
    warn "Certifique-se de configurar a conexão com o banco de dados"
fi

if [ -f "$BACKUP_DIR/ecosystem.config.js.backup" ]; then
    cp "$BACKUP_DIR/ecosystem.config.js.backup" "$APP_DIR/ecosystem.config.js"
    log "✅ Arquivo ecosystem.config.js restaurado"
fi

# 7. Limpar e reinstalar dependências
log "📦 Limpando e reinstalando dependências..."
rm -rf node_modules package-lock.json
sudo npm cache clean --force
sudo npm install --production --no-audit --no-fund


# 9. Verificar se mysql2 está instalado
if ! npm list mysql2 > /dev/null 2>&1; then
    log "📦 Instalando mysql2..."
    sudo npm install mysql2 --production
fi

# 10. Testar configuração da aplicação
log "🧪 Testando configuração da aplicação..."
timeout 15s node -e "
const app = require('./server.js');
console.log('✅ Aplicação carregou sem erros');
process.exit(0);
" || warn "Teste da aplicação falhou ou demorou mais que 15 segundos"

# 11. Configurar permissões
log "🔐 Configurando permissões..."
chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"

# 12. Criar diretórios necessários
log "📁 Criando diretórios necessários..."
mkdir -p "$APP_DIR/logs" "$APP_DIR/uploads" "$APP_DIR/backups" "$APP_DIR/temp"
chown -R www-data:www-data "$APP_DIR/logs" "$APP_DIR/uploads" "$APP_DIR/backups" "$APP_DIR/temp"

# 13. Iniciar aplicação com PM2
log "🚀 Iniciando aplicação com PM2..."
if [ -f "$APP_DIR/ecosystem.config.js" ]; then
    sudo pm2 start "$APP_DIR/ecosystem.config.js"
else
    # Configuração PM2 padrão se não existir ecosystem.config.js
    sudo pm2 start "$APP_DIR/server.js" --name "$APP_NAME" --env production
fi

# 14. Salvar configuração PM2
sudo pm2 save
sudo pm2 startup

# 15. Verificar se a aplicação está rodando
log "✅ Verificando status da aplicação..."
sleep 5
if sudo pm2 describe "$APP_NAME" > /dev/null 2>&1; then
    log "✅ Aplicação está rodando com sucesso!"
    sudo pm2 status
else
    error "❌ Falha ao iniciar a aplicação"
fi

# 16. Teste de conectividade (se curl estiver disponível)
if command -v curl > /dev/null 2>&1; then
    log "🌐 Testando conectividade HTTP..."
    sleep 3
    if curl -f -s http://localhost:3000 > /dev/null; then
        log "✅ Servidor HTTP respondendo corretamente"
    else
        warn "⚠️  Servidor HTTP não está respondendo na porta 3000"
    fi
fi

# 17. Limpeza
log "🧹 Limpando arquivos temporários..."
rm -f /tmp/check_db.sql /tmp/test_query.sql

# 18. Resumo final
echo ""
log "====================================="
log "         DEPLOY CONCLUÍDO!           "
log "====================================="
log "Branch deployada: $BRANCH"
log "Diretório: $APP_DIR"
log "Backup salvo em: $BACKUP_DIR"
log "Log completo: $LOG_FILE"
echo ""
info "Para monitorar a aplicação:"
info "  pm2 status"
info "  pm2 logs $APP_NAME"
info "  pm2 monit"
echo ""
info "Para verificar logs do deploy:"
info "  tail -f $LOG_FILE"
echo ""
log "🎉 Deploy realizado com sucesso!"
