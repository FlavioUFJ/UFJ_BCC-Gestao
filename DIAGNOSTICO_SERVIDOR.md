# Diagnóstico e Solução - ERR_CONNECTION_REFUSED

## Problema Identificado
O erro `ERR_CONNECTION_REFUSED` em `https://gestao.computacaoufj.online/` indica que:
- O servidor não está respondendo na porta 443 (HTTPS)
- O Nginx provavelmente parou de funcionar
- Pode haver conflito de configuração após a execução do script

## Comandos de Diagnóstico

Execute os seguintes comandos **no servidor Oracle Cloud** (via SSH):

### 1. Verificar Status dos Serviços
```bash
# Verificar status do Nginx
sudo systemctl status nginx

# Verificar status do PM2
sudo systemctl status pm2-ubuntu

# Verificar processos PM2
pm2 status
```

### 2. Verificar Logs de Erro
```bash
# Logs do Nginx
sudo tail -f /var/log/nginx/error.log

# Logs de acesso do Nginx
sudo tail -f /var/log/nginx/access.log

# Logs da aplicação
pm2 logs
```

### 3. Verificar Configuração do Nginx
```bash
# Testar configuração do Nginx
sudo nginx -t

# Verificar arquivo de configuração
sudo cat /etc/nginx/sites-available/gestao.computacaoufj.online

# Verificar se o link simbólico existe
ls -la /etc/nginx/sites-enabled/
```

### 4. Verificar Portas em Uso
```bash
# Verificar se as portas estão sendo usadas
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
sudo netstat -tlnp | grep :3000
```

## Soluções Mais Comuns

### Solução 1: Reiniciar Nginx
```bash
# Reiniciar o Nginx
sudo systemctl restart nginx

# Verificar se iniciou corretamente
sudo systemctl status nginx
```

### Solução 2: Corrigir Configuração do Nginx
```bash
# Se houver erro na configuração, editar o arquivo
sudo nano /etc/nginx/sites-available/gestao.computacaoufj.online

# Após corrigir, testar novamente
sudo nginx -t

# Se OK, recarregar configuração
sudo systemctl reload nginx
```

### Solução 3: Recriar Link Simbólico
```bash
# Remover link existente (se houver)
sudo rm /etc/nginx/sites-enabled/gestao.computacaoufj.online

# Criar novo link simbólico
sudo ln -s /etc/nginx/sites-available/gestao.computacaoufj.online /etc/nginx/sites-enabled/

# Reiniciar Nginx
sudo systemctl restart nginx
```

### Solução 4: Verificar Firewall
```bash
# Verificar regras do UFW
sudo ufw status

# Se necessário, permitir portas
sudo ufw allow 80
sudo ufw allow 443
```

### Solução 5: Reiniciar Aplicação PM2
```bash
# Reiniciar aplicação
pm2 restart gestao-app

# Verificar status
pm2 status

# Salvar configuração
pm2 save
```

## Configuração Nginx Correta

Se precisar recriar o arquivo de configuração:

```nginx
server {
    listen 80;
    server_name gestao.computacaoufj.online;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name gestao.computacaoufj.online;

    # Certificados SSL (configurar após Certbot)
    # ssl_certificate /etc/letsencrypt/live/gestao.computacaoufj.online/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/gestao.computacaoufj.online/privkey.pem;

    # Configurações SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Proxy para aplicação Node.js
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

    # Arquivos estáticos
    location /css/ {
        alias /var/www/html/gestao/public/css/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /js/ {
        alias /var/www/html/gestao/public/js/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /images/ {
        alias /var/www/html/gestao/public/images/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Próximos Passos

1. Execute os comandos de diagnóstico
2. Identifique o problema específico
3. Aplique a solução correspondente
4. Teste o acesso ao site
5. Se necessário, reconfigure o SSL com Certbot

## Comandos de Emergência

Se nada funcionar, execute o script de setup novamente:
```bash
cd /var/www/html/gestao
sudo chmod +x setup-server.sh
sudo ./setup-server.sh
```

## Contato

Se o problema persistir, forneça:
- Saída dos comandos de diagnóstico
- Logs de erro do Nginx
- Status dos serviços