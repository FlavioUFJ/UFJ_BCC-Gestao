#!/bin/bash

# Script de Configuração Inicial do Servidor Ubuntu
# UFJ BCC-Gestão - Oracle Cloud

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

log "🚀 Iniciando configuração do servidor Ubuntu para UFJ BCC-Gestão..."

# 1. Atualizar sistema
log "📦 Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# 2. Instalar dependências básicas
log "🔧 Instalando dependências básicas..."
sudo apt install -y curl wget git build-essential sqlite3 htop unzip

# 3. Instalar Node.js
log "📦 Instalando Node.js..."
if ! command -v node > /dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    log "✅ Node.js $(node --version) instalado"
else
    log "✅ Node.js já está instalado: $(node --version)"
fi

# 4. Instalar PM2
log "📦 Instalando PM2..."
if ! command -v pm2 > /dev/null 2>&1; then
    sudo npm install -g pm2
    log "✅ PM2 instalado"
else
    log "✅ PM2 já está instalado"
fi

# 5. Instalar Nginx
log "📦 Instalando Nginx..."
if ! command -v nginx > /dev/null 2>&1; then
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    log "✅ Nginx instalado e iniciado"
else
    log "✅ Nginx já está instalado"
fi

# 6. Configurar firewall
log "🔥 Configurando firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
echo "y" | sudo ufw enable
log "✅ Firewall configurado"

# 7. Criar diretórios necessários
log "📁 Criando diretórios..."
mkdir -p /home/ubuntu/logs
mkdir -p /home/ubuntu/backups
log "✅ Diretórios criados"

# 8. Clonar repositório
log "📥 Clonando repositório..."
if [ ! -d "/home/ubuntu/UFJ_BCC-Gestao" ]; then
    cd /home/ubuntu
    git clone https://github.com/FlavioUFJ/UFJ_BCC-Gestao.git
    cd UFJ_BCC-Gestao
    git checkout dev
    log "✅ Repositório clonado"
else
    log "✅ Repositório já existe"
    cd /home/ubuntu/UFJ_BCC-Gestao
    git pull origin dev
fi

# 9. Instalar dependências da aplicação
log "📦 Instalando dependências da aplicação..."
npm install --production
log "✅ Dependências instaladas"

# 10. Configurar arquivo .env
log "⚙️  Configurando arquivo .env..."
if [ ! -f "/home/ubuntu/UFJ_BCC-Gestao/.env" ]; then
    cp .env.example .env
    
    # Gerar chave secreta aleatória
    SECRET_KEY=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    sed -i "s/ALTERE_ESTA_CHAVE_SECRETA_MUITO_FORTE_AQUI/$SECRET_KEY/g" .env
    
    warn "Arquivo .env criado com chave secreta gerada automaticamente."
    warn "Por favor, edite o arquivo .env e configure as outras variáveis:"
    warn "nano /home/ubuntu/UFJ_BCC-Gestao/.env"
else
    log "✅ Arquivo .env já existe"
fi

# 11. Configurar permissões do banco de dados
if [ -f "/home/ubuntu/UFJ_BCC-Gestao/database.db" ]; then
    log "🗄️  Configurando permissões do banco de dados..."
    chown ubuntu:ubuntu /home/ubuntu/UFJ_BCC-Gestao/database.db
    chmod 664 /home/ubuntu/UFJ_BCC-Gestao/database.db
    log "✅ Permissões do banco configuradas"
fi

# 12. Configurar Nginx
log "🌐 Configurando Nginx..."
SERVER_IP=$(curl -s ifconfig.me)

cat > /tmp/ufj-bcc-gestao << EOF
server {
    listen 80;
    server_name $SERVER_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Servir arquivos estáticos diretamente
    location /css {
        alias /home/ubuntu/UFJ_BCC-Gestao/public/css;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /js {
        alias /home/ubuntu/UFJ_BCC-Gestao/public/js;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /images {
        alias /home/ubuntu/UFJ_BCC-Gestao/public/images;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

sudo mv /tmp/ufj-bcc-gestao /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/ufj-bcc-gestao /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
log "✅ Nginx configurado"

# 13. Configurar script de backup automático
log "💾 Configurando backup automático..."
cat > /home/ubuntu/backup_db.sh << 'EOF'
#!/bin/bash
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR
cp /home/ubuntu/UFJ_BCC-Gestao/database.db $BACKUP_DIR/database_backup_$DATE.db
echo "Backup criado: database_backup_$DATE.db"

# Manter apenas os últimos 7 backups
find $BACKUP_DIR -name "database_backup_*.db" -type f -mtime +7 -delete
EOF

chmod +x /home/ubuntu/backup_db.sh

# Adicionar ao crontab se não existir
if ! crontab -l 2>/dev/null | grep -q "backup_db.sh"; then
    (crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/backup_db.sh") | crontab -
    log "✅ Backup automático configurado (diário às 2h)"
else
    log "✅ Backup automático já configurado"
fi

# 14. Instalar PM2 logrotate
log "📝 Configurando rotação de logs..."
pm2 install pm2-logrotate
log "✅ Rotação de logs configurada"

# 15. Tornar script de deploy executável
chmod +x /home/ubuntu/UFJ_BCC-Gestao/deploy.sh

# 16. Iniciar aplicação
log "🚀 Iniciando aplicação..."
cd /home/ubuntu/UFJ_BCC-Gestao
pm2 start ecosystem.config.js
pm2 save
pm2 startup ubuntu -u ubuntu --hp /home/ubuntu

log "✅ Configuração inicial concluída! 🎉"
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
info "📋 PRÓXIMOS PASSOS:"
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
info "1. Configure as variáveis de ambiente:"
info "   nano /home/ubuntu/UFJ_BCC-Gestao/.env"
info ""
info "2. Execute o comando gerado pelo PM2 startup (mostrado acima)"
info ""
info "3. Reinicie a aplicação:"
info "   pm2 restart ufj-bcc-gestao"
info ""
info "4. Acesse a aplicação:"
info "   http://$SERVER_IP"
info ""
info "5. Para atualizações futuras, use:"
info "   /home/ubuntu/UFJ_BCC-Gestao/deploy.sh"
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
info "📊 COMANDOS ÚTEIS:"
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
info "• Ver status: pm2 status"
info "• Ver logs: pm2 logs ufj-bcc-gestao"
info "• Monitorar: pm2 monit"
info "• Backup manual: /home/ubuntu/backup_db.sh"
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"