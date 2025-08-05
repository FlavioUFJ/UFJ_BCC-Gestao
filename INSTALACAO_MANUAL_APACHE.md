# Instalação Manual - Servidor com Apache2 e Guacamole

## Ambiente Atual
- ✅ Ubuntu Server
- ✅ Apache2 (gerenciando múltiplos sites + proxy reverso Guacamole)
- ✅ Guacamole
- 🔄 **Objetivo**: Instalar aplicação Node.js sem conflitos

## Pré-requisitos e Verificações

### 1. Verificar Status Atual
```bash
# Verificar Apache2
sudo systemctl status apache2
sudo apache2ctl -S

# Verificar sites habilitados
sudo ls -la /etc/apache2/sites-enabled/

# Verificar portas em uso
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
```

### 2. Verificar Configuração do Guacamole
```bash
# Verificar configuração atual do Apache para Guacamole
sudo cat /etc/apache2/sites-enabled/000-default.conf
# ou
sudo find /etc/apache2/sites-enabled/ -name "*.conf" -exec cat {} \;
```

## Instalação Passo-a-Passo

### Passo 1: Instalar Node.js e npm
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version
npm --version
```

### Passo 2: Instalar PM2 Globalmente
```bash
# Instalar PM2
sudo npm install -g pm2

# Verificar instalação
pm2 --version

# Configurar PM2 para inicialização automática
sudo pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

### Passo 3: Instalar Git (se necessário)
```bash
# Verificar se Git está instalado
git --version

# Se não estiver, instalar
sudo apt install git -y
```

### Passo 4: Clonar e Configurar a Aplicação
```bash
# Criar diretório para aplicações Node.js (mais apropriado)
sudo mkdir -p /opt/nodejs/gestao
sudo chown -R ubuntu:ubuntu /opt/nodejs/gestao

# Alternativa: usar diretório do usuário (mais permissivo)
# mkdir -p /home/ubuntu/apps/gestao
# cd /home/ubuntu/apps/gestao

# Clonar repositório
cd /opt/nodejs/gestao
git clone https://github.com/FlavioUFJ/UFJ_BCC-Gestao.git .

# Configurar branch
git checkout dev

# Instalar dependências
npm install
```

### Passo 5: Configurar Variáveis de Ambiente
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar configurações
nano .env
```

**Configuração .env sugerida:**
```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=sua_chave_secreta_muito_forte_aqui
DB_PATH=./database.db
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_senha_app
EMAIL_FROM=seu_email@gmail.com
BASE_URL=https://gestao.computacaoufj.online
```

### Passo 6: Testar a Aplicação
```bash
# Testar localmente
node server.js

# Em outro terminal, testar conectividade
curl http://localhost:3000

# Parar o teste (Ctrl+C)
```

### Passo 7: Configurar PM2
```bash
# Iniciar aplicação com PM2
pm2 start ecosystem.config.js

# Verificar status
pm2 status
pm2 logs ufj-bcc-gestao

# Salvar configuração PM2
pm2 save
```

### Passo 8: Habilitar Módulos Apache Necessários
```bash
# Habilitar módulos para proxy reverso
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_balancer
sudo a2enmod lbmethod_byrequests
sudo a2enmod headers
sudo a2enmod ssl
sudo a2enmod rewrite

# Reiniciar Apache
sudo systemctl restart apache2
```

### Passo 9: Criar Configuração do Site no Apache
```bash
# Criar arquivo de configuração
sudo nano /etc/apache2/sites-available/gestao.computacaoufj.online.conf
```

**Conteúdo do arquivo:**
```apache
<VirtualHost *:80>
    ServerName gestao.computacaoufj.online
    ServerAlias www.gestao.computacaoufj.online
    
    # Redirecionar HTTP para HTTPS
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
    
    ErrorLog ${APACHE_LOG_DIR}/gestao_error.log
    CustomLog ${APACHE_LOG_DIR}/gestao_access.log combined
</VirtualHost>

<VirtualHost *:443>
    ServerName gestao.computacaoufj.online
    ServerAlias www.gestao.computacaoufj.online
    
    # Configuração SSL (será configurada depois com Certbot)
    # SSLEngine on
    # SSLCertificateFile /etc/letsencrypt/live/gestao.computacaoufj.online/fullchain.pem
    # SSLCertificateKeyFile /etc/letsencrypt/live/gestao.computacaoufj.online/privkey.pem
    
    # Proxy para aplicação Node.js
    ProxyPreserveHost On
    ProxyRequests Off
    
    # Headers para WebSocket e aplicações modernas
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # Headers adicionais
    ProxyPassReverse / http://localhost:3000/
    ProxyPassReverseMatch ^/(.*) http://localhost:3000/$1
    
    # Headers para sessões e cookies
    Header always set X-Frame-Options DENY
    Header always set X-Content-Type-Options nosniff
    
    ErrorLog ${APACHE_LOG_DIR}/gestao_ssl_error.log
    CustomLog ${APACHE_LOG_DIR}/gestao_ssl_access.log combined
</VirtualHost>
```

### Passo 10: Habilitar Site e Testar
```bash
# Habilitar site
sudo a2ensite gestao.computacaoufj.online.conf

# Testar configuração Apache
sudo apache2ctl configtest

# Se OK, recarregar Apache
sudo systemctl reload apache2

# Verificar status
sudo systemctl status apache2
```

### Passo 11: Configurar SSL com Certbot
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-apache -y

# Obter certificado SSL
sudo certbot --apache -d gestao.computacaoufj.online -d www.gestao.computacaoufj.online

# Testar renovação automática
sudo certbot renew --dry-run
```

## Verificações Finais

### 1. Testar Aplicação
```bash
# Verificar PM2
pm2 status
pm2 logs ufj-bcc-gestao --lines 20

# Verificar Apache
sudo systemctl status apache2
sudo apache2ctl -S

# Testar conectividade local
curl -I http://localhost:3000
curl -I https://gestao.computacaoufj.online
```

### 2. Verificar Logs
```bash
# Logs da aplicação
pm2 logs ufj-bcc-gestao

# Logs do Apache
sudo tail -f /var/log/apache2/gestao_error.log
sudo tail -f /var/log/apache2/gestao_access.log
```

### 3. Testar Funcionalidades
- Acesso via browser: `https://gestao.computacaoufj.online`
- Login de usuário
- Navegação entre páginas
- Upload de arquivos (se aplicável)

## Comandos de Monitoramento

```bash
# Status geral
pm2 status
sudo systemctl status apache2
sudo systemctl status pm2-ubuntu

# Logs em tempo real
pm2 logs ufj-bcc-gestao --lines 50 -f
sudo tail -f /var/log/apache2/gestao_error.log

# Reiniciar serviços se necessário
pm2 restart ufj-bcc-gestao
sudo systemctl restart apache2
```

## Troubleshooting

### Se a aplicação não iniciar:
1. Verificar logs: `pm2 logs ufj-bcc-gestao`
2. Verificar dependências: `npm install`
3. Verificar arquivo .env
4. Verificar permissões: `ls -la /var/www/html/gestao`

### Se Apache não conseguir fazer proxy:
1. Verificar módulos habilitados: `sudo apache2ctl -M | grep proxy`
2. Verificar configuração: `sudo apache2ctl configtest`
3. Verificar se aplicação está rodando na porta 3000: `netstat -tlnp | grep :3000`

### Se SSL não funcionar:
1. Verificar certificados: `sudo certbot certificates`
2. Renovar se necessário: `sudo certbot renew`
3. Verificar configuração SSL no Apache

## Backup e Manutenção

```bash
# Backup da aplicação
sudo tar -czf /home/ubuntu/backup-gestao-$(date +%Y%m%d).tar.gz /opt/nodejs/gestao

# Backup da configuração Apache
sudo cp /etc/apache2/sites-available/gestao.computacaoufj.online.conf /home/ubuntu/

# Atualizar aplicação
cd /opt/nodejs/gestao
git pull origin dev
npm install
pm2 restart ufj-bcc-gestao
```

Este guia garante uma instalação limpa e compatível com o ambiente Apache2 + Guacamole existente.