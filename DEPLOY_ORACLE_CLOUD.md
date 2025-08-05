# Deploy da Aplicação UFJ BCC-Gestão na Oracle Cloud

## Pré-requisitos

- Servidor Ubuntu na Oracle Cloud configurado
- Acesso SSH ao servidor
- Domínio configurado (opcional, mas recomendado)

## 1. Preparação do Servidor Ubuntu

### 1.1 Conectar ao servidor via SSH
```bash
ssh ubuntu@SEU_IP_PUBLICO
```

### 1.2 Atualizar o sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 Instalar dependências básicas
```bash
sudo apt install -y curl wget git build-essential
```

## 2. Instalação do Node.js

### 2.1 Instalar Node.js via NodeSource
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2.2 Verificar instalação
```bash
node --version
npm --version
```

## 3. Instalação do PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

## 4. Configuração do Banco de Dados SQLite

### 4.1 Instalar SQLite
```bash
sudo apt install -y sqlite3
```

## 5. Deploy da Aplicação

### 5.1 Clonar o repositório
```bash
cd /home/ubuntu
git clone https://github.com/FlavioUFJ/UFJ_BCC-Gestao.git
cd UFJ_BCC-Gestao
```

### 5.2 Instalar dependências
```bash
npm install
```

### 5.3 Criar arquivo de ambiente
```bash
cp .env.example .env
nano .env
```

**Configurar as variáveis de ambiente:**
```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=sua_chave_secreta_muito_forte_aqui
DB_PATH=./database.db

# Configurações de Email (se necessário)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_senha_de_app
EMAIL_FROM=seu_email@gmail.com
```

### 5.4 Configurar permissões do banco de dados
```bash
sudo chown ubuntu:ubuntu database.db
chmod 664 database.db
```

### 5.5 Testar a aplicação
```bash
node server.js
```

## 6. Configuração do PM2

### 6.1 Criar arquivo de configuração do PM2
```bash
nano ecosystem.config.js
```

**Conteúdo do arquivo:**
```javascript
module.exports = {
  apps: [{
    name: 'ufj-bcc-gestao',
    script: 'server.js',
    cwd: '/home/ubuntu/UFJ_BCC-Gestao',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### 6.2 Iniciar aplicação com PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6.3 Executar o comando gerado pelo PM2 startup (será mostrado no terminal)

## 7. Configuração do Nginx (Proxy Reverso)

### 7.1 Instalar Nginx
```bash
sudo apt install -y nginx
```

### 7.2 Criar configuração do site
```bash
sudo nano /etc/nginx/sites-available/ufj-bcc-gestao
```

**Conteúdo do arquivo:**
```nginx
server {
    listen 80;
    server_name SEU_DOMINIO_OU_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
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
```

### 7.3 Ativar o site
```bash
sudo ln -s /etc/nginx/sites-available/ufj-bcc-gestao /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## 8. Configuração do Firewall

### 8.1 Configurar UFW
```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 8.2 Verificar status
```bash
sudo ufw status
```

## 9. Configuração SSL com Let's Encrypt (Opcional)

### 9.1 Instalar Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 9.2 Obter certificado SSL
```bash
sudo certbot --nginx -d SEU_DOMINIO
```

## 10. Comandos Úteis para Manutenção

### PM2
```bash
# Ver status das aplicações
pm2 status

# Ver logs
pm2 logs ufj-bcc-gestao

# Reiniciar aplicação
pm2 restart ufj-bcc-gestao

# Parar aplicação
pm2 stop ufj-bcc-gestao

# Atualizar aplicação
cd /home/ubuntu/UFJ_BCC-Gestao
git pull
npm install
pm2 restart ufj-bcc-gestao
```

### Nginx
```bash
# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver logs do Nginx
sudo tail -f /var/log/nginx/error.log
```

### Sistema
```bash
# Ver uso de recursos
htop

# Ver espaço em disco
df -h

# Ver logs do sistema
sudo journalctl -f
```

## 11. Backup do Banco de Dados

### 11.1 Criar script de backup
```bash
nano /home/ubuntu/backup_db.sh
```

**Conteúdo do script:**
```bash
#!/bin/bash
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR
cp /home/ubuntu/UFJ_BCC-Gestao/database.db $BACKUP_DIR/database_backup_$DATE.db
echo "Backup criado: database_backup_$DATE.db"

# Manter apenas os últimos 7 backups
find $BACKUP_DIR -name "database_backup_*.db" -type f -mtime +7 -delete
```

### 11.2 Tornar executável e agendar
```bash
chmod +x /home/ubuntu/backup_db.sh
crontab -e
```

**Adicionar linha para backup diário às 2h:**
```
0 2 * * * /home/ubuntu/backup_db.sh
```

## 12. Monitoramento

### 12.1 Instalar htop para monitoramento
```bash
sudo apt install -y htop
```

### 12.2 Configurar monitoramento do PM2
```bash
pm2 install pm2-logrotate
```

## Troubleshooting

### Problema: Aplicação não inicia
- Verificar logs: `pm2 logs ufj-bcc-gestao`
- Verificar permissões do banco: `ls -la database.db`
- Verificar variáveis de ambiente: `cat .env`

### Problema: Nginx não consegue conectar
- Verificar se a aplicação está rodando: `pm2 status`
- Verificar configuração do Nginx: `sudo nginx -t`
- Verificar logs do Nginx: `sudo tail -f /var/log/nginx/error.log`

### Problema: Banco de dados corrompido
- Restaurar backup: `cp /home/ubuntu/backups/database_backup_YYYYMMDD_HHMMSS.db /home/ubuntu/UFJ_BCC-Gestao/database.db`
- Reiniciar aplicação: `pm2 restart ufj-bcc-gestao`

---

**Nota:** Substitua `SEU_IP_PUBLICO` e `SEU_DOMINIO` pelos valores reais do seu servidor.