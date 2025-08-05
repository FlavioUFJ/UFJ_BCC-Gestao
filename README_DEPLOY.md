# 🚀 Deploy UFJ BCC-Gestão - Oracle Cloud Ubuntu

## 📋 Resumo Rápido

Este guia te ajudará a publicar a aplicação UFJ BCC-Gestão em um servidor Ubuntu na Oracle Cloud.

**Configuração do Servidor:**
- Diretório: `/var/www/html/gestao/`
- URL: `https://gestao.computacaoufj.online/`

## 🎯 Pré-requisitos

- ✅ Servidor Ubuntu na Oracle Cloud configurado
- ✅ Acesso SSH ao servidor
- ✅ Domínio configurado (opcional)

## 🚀 Instalação Rápida (Recomendado)

### 1. Conectar ao servidor
```bash
ssh ubuntu@SEU_IP_PUBLICO
```

### 2. Executar script de configuração automática
```bash
# Baixar e executar o script de setup
wget https://raw.githubusercontent.com/FlavioUFJ/UFJ_BCC-Gestao/dev/setup-server.sh
chmod +x setup-server.sh
./setup-server.sh
```

### 3. Configurar variáveis de ambiente
```bash
nano /var/www/html/gestao/.env
```

### 4. Executar comando do PM2 startup (será mostrado no terminal)

### 5. Reiniciar aplicação
```bash
pm2 restart ufj-bcc-gestao
```

### 6. Acessar aplicação
```
http://SEU_IP_PUBLICO
```

## 📚 Documentação Completa

- **[DEPLOY_ORACLE_CLOUD.md](./DEPLOY_ORACLE_CLOUD.md)** - Guia completo passo a passo
- **[setup-server.sh](./setup-server.sh)** - Script de configuração inicial automática
- **[deploy.sh](./deploy.sh)** - Script para atualizações futuras
- **[ecosystem.config.js](./ecosystem.config.js)** - Configuração do PM2
- **[.env.example](./.env.example)** - Template das variáveis de ambiente

## 🔄 Atualizações Futuras

Para atualizar a aplicação após mudanças no código:

```bash
ssh ubuntu@SEU_IP_PUBLICO
cd /var/www/html/gestao
./deploy.sh
```

## 🛠️ Comandos Úteis

### PM2 (Gerenciador de Processos)
```bash
# Ver status
pm2 status

# Ver logs
pm2 logs ufj-bcc-gestao

# Monitorar em tempo real
pm2 monit

# Reiniciar aplicação
pm2 restart ufj-bcc-gestao

# Parar aplicação
pm2 stop ufj-bcc-gestao
```

### Nginx (Servidor Web)
```bash
# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver logs de erro
sudo tail -f /var/log/nginx/error.log
```

### Sistema
```bash
# Monitorar recursos
htop

# Ver espaço em disco
df -h

# Backup manual do banco
/home/ubuntu/backup_db.sh
```

## 🔒 SSL/HTTPS (Opcional)

Para configurar SSL gratuito com Let's Encrypt:

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d gestao.computacaoufj.online
```

## 🆘 Solução de Problemas

### Aplicação não inicia
```bash
# Verificar logs
pm2 logs ufj-bcc-gestao

# Verificar arquivo .env
cat /home/ubuntu/UFJ_BCC-Gestao/.env

# Verificar permissões do banco
ls -la /home/ubuntu/UFJ_BCC-Gestao/database.db
```

### Nginx não conecta
```bash
# Verificar se aplicação está rodando
pm2 status

# Testar configuração Nginx
sudo nginx -t

# Ver logs do Nginx
sudo tail -f /var/log/nginx/error.log
```

### Restaurar backup do banco
```bash
# Listar backups disponíveis
ls -la /home/ubuntu/backups/

# Restaurar backup específico
cp /home/ubuntu/backups/database_backup_YYYYMMDD_HHMMSS.db /home/ubuntu/UFJ_BCC-Gestao/database.db
pm2 restart ufj-bcc-gestao
```

## 📊 Monitoramento

### Logs da Aplicação
- **PM2 Logs**: `pm2 logs ufj-bcc-gestao`
- **Logs do Sistema**: `/home/ubuntu/logs/`
- **Logs do Nginx**: `/var/log/nginx/`

### Backups Automáticos
- **Frequência**: Diário às 2h da manhã
- **Localização**: `/home/ubuntu/backups/`
- **Retenção**: 7 dias
- **Script**: `/home/ubuntu/backup_db.sh`

## 🌐 URLs Importantes

- **Aplicação**: `https://gestao.computacaoufj.online/`
- **Local**: `http://localhost:3000`
- **Login**: `https://gestao.computacaoufj.online/auth/login`
- **Repositório**: https://github.com/FlavioUFJ/UFJ_BCC-Gestao
- **Logs PM2**: `pm2 logs ufj-bcc-gestao`
- **Monitoramento**: `pm2 monit`

## 📞 Suporte

Em caso de dúvidas ou problemas:

1. Consulte os logs: `pm2 logs ufj-bcc-gestao`
2. Verifique a documentação completa: [DEPLOY_ORACLE_CLOUD.md](./DEPLOY_ORACLE_CLOUD.md)
3. Verifique as issues no GitHub: https://github.com/FlavioUFJ/UFJ_BCC-Gestao/issues

---

**Nota**: Substitua `SEU_IP_PUBLICO` e `SEU_DOMINIO` pelos valores reais do seu servidor.