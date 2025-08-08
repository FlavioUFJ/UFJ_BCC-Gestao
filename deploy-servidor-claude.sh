#!/bin/bash

#############################################
# Script de Deploy - Sistema Gestão BCC UFJ
# Servidor: Ubuntu ARM
# Aplicação: Node.js com PM2
#############################################

# Configurações
APP_NAME="gestao-bcc-ufj"
APP_DIR="/opt/nodejs/apps/gestao-bcc"
BACKUP_DIR="/opt/nodejs/backups"
TEMP_DIR="/tmp/gestao-bcc-update"
GIT_REPO="https://github.com/FlavioUFJ/UFJ_BCC-Gestao.git"  # Altere para sua URL do Git
BRANCH="dev"  # ou master, production, etc

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_message() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERRO:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] AVISO:${NC} $1"
}

# Verificar se está rodando como root ou sudo
if [[ $EUID -ne 0 ]] && [[ -z "$SUDO_USER" ]]; then
   print_error "Este script precisa ser executado com sudo"
   exit 1
fi

print_message "======================================"
print_message "Iniciando Deploy do Sistema Gestão BCC"
print_message "======================================"

# 1. Criar diretório de backup se não existir
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    print_message "Diretório de backup criado: $BACKUP_DIR"
fi

# 2. Fazer backup da aplicação atual
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/gestao-bcc-backup-$TIMESTAMP.tar.gz"

print_message "Criando backup em: $BACKUP_FILE"

# Lista de arquivos/diretórios a preservar (não incluir no backup do código)
PRESERVE_LIST=(
    ".env"
    ".env.production"
    "ecosystem.config.js"
    "uploads"
    "logs"
    "node_modules"
)

# Criar backup completo primeiro
cd "$APP_DIR"
tar -czf "$BACKUP_FILE" \
    --exclude=node_modules \
    --exclude=uploads \
    --exclude=logs \
    --exclude=.git \
    .

if [ $? -eq 0 ]; then
    print_message "Backup criado com sucesso!"
else
    print_error "Falha ao criar backup. Abortando deploy."
    exit 1
fi

# 3. Salvar configurações locais em local temporário
print_message "Preservando configurações locais..."
TEMP_CONFIG="/tmp/gestao-config-$TIMESTAMP"
mkdir -p "$TEMP_CONFIG"

# Copiar arquivos de configuração para local seguro
for item in "${PRESERVE_LIST[@]}"; do
    if [ -e "$APP_DIR/$item" ]; then
        if [ -d "$APP_DIR/$item" ]; then
            cp -r "$APP_DIR/$item" "$TEMP_CONFIG/"
            print_message "Preservado diretório: $item"
        else
            cp "$APP_DIR/$item" "$TEMP_CONFIG/"
            print_message "Preservado arquivo: $item"
        fi
    fi
done

# 4. Verificar método de atualização
print_message "Escolha o método de atualização:"
echo "1) Git Pull (requer repositório configurado)"
echo "2) Upload de arquivo ZIP"
echo "3) Rsync de outro servidor"
read -p "Opção (1-3): " UPDATE_METHOD

case $UPDATE_METHOD in
    1)
        # Git Pull
        print_message "Atualizando via Git..."
        cd "$APP_DIR"
        
        # Verificar se é um repositório git
        if [ ! -d ".git" ]; then
            print_error "Diretório não é um repositório Git"
            print_message "Deseja clonar o repositório? (s/n)"
            read -p "Resposta: " CLONE_REPO
            
            if [ "$CLONE_REPO" = "s" ]; then
                cd /opt/nodejs/apps
                rm -rf gestao-bcc
                git clone "$GIT_REPO" gestao-bcc
                cd gestao-bcc
                git checkout "$BRANCH"
            else
                print_error "Abortando deploy"
                exit 1
            fi
        else
            # Fazer stash de mudanças locais (se houver)
            git stash
            
            # Atualizar repositório
            git fetch origin
            git checkout "$BRANCH"
            git pull origin "$BRANCH"
        fi
        ;;
        
    2)
        # Upload ZIP
        print_message "Upload via arquivo ZIP"
        read -p "Caminho completo do arquivo ZIP: " ZIP_FILE
        
        if [ ! -f "$ZIP_FILE" ]; then
            print_error "Arquivo não encontrado: $ZIP_FILE"
            exit 1
        fi
        
        print_message "Extraindo arquivo..."
        mkdir -p "$TEMP_DIR"
        unzip -q "$ZIP_FILE" -d "$TEMP_DIR"
        
        # Copiar arquivos, exceto os que devem ser preservados
        rsync -av --delete \
            --exclude='.env' \
            --exclude='.env.production' \
            --exclude='ecosystem.config.js' \
            --exclude='uploads/' \
            --exclude='logs/' \
            --exclude='node_modules/' \
            "$TEMP_DIR/" "$APP_DIR/"
            
        rm -rf "$TEMP_DIR"
        ;;
        
    3)
        # Rsync
        print_message "Atualização via Rsync"
        read -p "Servidor de origem (ex: user@server:/path): " RSYNC_SOURCE
        
        rsync -avz --delete \
            --exclude='.env' \
            --exclude='.env.production' \
            --exclude='ecosystem.config.js' \
            --exclude='uploads/' \
            --exclude='logs/' \
            --exclude='node_modules/' \
            "$RSYNC_SOURCE/" "$APP_DIR/"
        ;;
        
    *)
        print_error "Opção inválida"
        exit 1
        ;;
esac

# 5. Restaurar configurações preservadas
print_message "Restaurando configurações locais..."
for item in "${PRESERVE_LIST[@]}"; do
    if [ -e "$TEMP_CONFIG/$item" ]; then
        # Não sobrescrever uploads e logs, apenas garantir que existam
        if [[ "$item" == "uploads" ]] || [[ "$item" == "logs" ]]; then
            if [ ! -d "$APP_DIR/$item" ]; then
                cp -r "$TEMP_CONFIG/$item" "$APP_DIR/"
                print_message "Restaurado diretório: $item"
            fi
        else
            cp -r "$TEMP_CONFIG/$item" "$APP_DIR/"
            print_message "Restaurado: $item"
        fi
    fi
done

# 6. Ajustar permissões
print_message "Ajustando permissões..."
cd "$APP_DIR"
chown -R $SUDO_USER:$SUDO_USER .
chmod -R 755 .
chmod -R 775 uploads/ logs/

# 7. Instalar/Atualizar dependências
print_message "Instalando dependências..."
cd "$APP_DIR"

# Limpar cache do npm
npm cache clean --force

# Instalar dependências com flags específicas para ARM
npm ci --production || npm install --production --no-audit --no-fund

# Rebuild de módulos nativos para ARM (especialmente sqlite3)
print_message "Recompilando módulos nativos para ARM..."
npm rebuild

# Garantir que o sqlite3 está compilado para ARM
if grep -q "sqlite3" package.json; then
    print_message "Recompilando SQLite3 para ARM..."
    npm uninstall sqlite3
    npm install sqlite3 --build-from-source --target_arch=arm64 --no-audit --no-fund
fi

# 8. Executar migrações de banco se existirem
if [ -f "migrate.js" ] || [ -f "src/migrations/migrate.js" ]; then
    print_message "Executando migrações de banco de dados..."
    node migrate.js || node src/migrations/migrate.js || true
fi

# 9. Verificar configuração antes de reiniciar
print_message "Verificando configurações..."
node -c server.js
if [ $? -ne 0 ]; then
    print_error "Erro de sintaxe no código. Verifique o server.js"
    print_warning "Deseja continuar mesmo assim? (s/n)"
    read -p "Resposta: " CONTINUE
    if [ "$CONTINUE" != "s" ]; then
        print_message "Revertendo para backup..."
        tar -xzf "$BACKUP_FILE" -C "$APP_DIR"
        exit 1
    fi
fi

# 10. Reiniciar aplicação com PM2
print_message "Reiniciando aplicação..."
pm2 stop "$APP_NAME" || true
pm2 start ecosystem.config.js

# Aguardar inicialização
sleep 5

# 11. Verificar se aplicação está rodando
pm2 status "$APP_NAME"
APP_STATUS=$(pm2 info "$APP_NAME" | grep status | awk '{print $4}')

if [[ "$APP_STATUS" == *"online"* ]]; then
    print_message "✅ Aplicação reiniciada com sucesso!"
else
    print_error "Aplicação não está online. Verificando logs..."
    pm2 logs "$APP_NAME" --lines 20
    
    print_warning "Deseja reverter para o backup? (s/n)"
    read -p "Resposta: " REVERT
    
    if [ "$REVERT" = "s" ]; then
        print_message "Revertendo para backup..."
        pm2 stop "$APP_NAME"
        cd "$APP_DIR"
        rm -rf *
        tar -xzf "$BACKUP_FILE" -C "$APP_DIR"
        
        # Restaurar node_modules do backup temporário
        if [ -d "$TEMP_CONFIG/node_modules" ]; then
            cp -r "$TEMP_CONFIG/node_modules" "$APP_DIR/"
        fi
        
        pm2 start ecosystem.config.js
        print_message "Revertido para versão anterior"
    fi
fi

# 12. Testar aplicação
print_message "Testando aplicação..."
sleep 2

# Teste local
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001)
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "302" ]; then
    print_message "✅ Aplicação respondendo localmente (HTTP $HTTP_STATUS)"
else
    print_warning "⚠️ Aplicação retornou HTTP $HTTP_STATUS"
fi

# Teste via domínio
HTTPS_STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" https://gestao.computacaoufj.online)
if [ "$HTTPS_STATUS" = "200" ] || [ "$HTTPS_STATUS" = "302" ]; then
    print_message "✅ Aplicação acessível via HTTPS (HTTP $HTTPS_STATUS)"
else
    print_warning "⚠️ HTTPS retornou HTTP $HTTPS_STATUS"
fi

# 13. Limpar arquivos temporários
rm -rf "$TEMP_CONFIG"
print_message "Arquivos temporários removidos"

# 14. Salvar estado do PM2
pm2 save
print_message "Estado do PM2 salvo"

# 15. Mostrar informações finais
print_message "======================================"
print_message "Deploy Concluído!"
print_message "======================================"
print_message "Backup salvo em: $BACKUP_FILE"
print_message "Aplicação: https://gestao.computacaoufj.online"
print_message ""
print_message "Comandos úteis:"
print_message "  pm2 status          - Ver status"
print_message "  pm2 logs $APP_NAME  - Ver logs"
print_message "  pm2 monit           - Monitorar"
print_message ""

# Manter últimos 5 backups apenas
print_message "Limpando backups antigos (mantendo últimos 5)..."
cd "$BACKUP_DIR"
ls -t gestao-bcc-backup-*.tar.gz | tail -n +6 | xargs rm -f 2>/dev/null

print_message "Script finalizado!"
