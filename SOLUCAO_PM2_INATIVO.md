# Solução: PM2 Inativo - Sistema de Gestão UFJ

## Problema Identificado
O serviço PM2 está **inativo (dead)**, o que significa que a aplicação Node.js não está rodando.

**Status atual:**
```
pm2-ubuntu.service - PM2 process manager
Loaded: loaded (/etc/systemd/system/pm2-ubuntu.service; enabled; preset: enabled)
Active: inactive (dead)
```

## Solução Passo a Passo

### 1. Reiniciar o Serviço PM2
```bash
# Reiniciar o serviço PM2
sudo systemctl start pm2-ubuntu

# Verificar se iniciou corretamente
sudo systemctl status pm2-ubuntu
```

### 2. Verificar Processos PM2
```bash
# Listar processos PM2
pm2 status

# Se não houver processos, iniciar a aplicação
pm2 start ecosystem.config.js

# Verificar novamente
pm2 status
```

### 3. Salvar Configuração PM2
```bash
# Salvar a lista de processos para reinicialização automática
pm2 save

# Verificar se foi salvo
pm2 dump
```

### 4. Verificar Logs da Aplicação
```bash
# Ver logs em tempo real
pm2 logs

# Ver logs específicos da aplicação
pm2 logs gestao-app
```

### 5. Testar Conectividade
```bash
# Testar se a aplicação responde localmente
curl http://localhost:3000

# Ou verificar se a porta está em uso
sudo netstat -tlnp | grep :3000
```

## Comandos de Diagnóstico Adicional

### Verificar Logs do Sistema
```bash
# Logs do serviço PM2
sudo journalctl -u pm2-ubuntu -f

# Logs do sistema
sudo journalctl -xe
```

### Verificar Configuração do PM2
```bash
# Verificar arquivo de configuração
cat /var/www/html/gestao/ecosystem.config.js

# Verificar se o diretório existe
ls -la /var/www/html/gestao/
```

## Solução Alternativa (Se o Problema Persistir)

### Reconfigurar PM2 Completamente
```bash
# Parar todos os processos PM2
pm2 kill

# Remover configuração de startup
pm2 unstartup systemd

# Reconfigurar startup
pm2 startup
# (Execute o comando que o PM2 mostrar)

# Iniciar aplicação novamente
cd /var/www/html/gestao
pm2 start ecosystem.config.js

# Salvar configuração
pm2 save
```

## Verificar Nginx Após Correção

Após o PM2 estar funcionando:

```bash
# Verificar status do Nginx
sudo systemctl status nginx

# Se necessário, reiniciar Nginx
sudo systemctl restart nginx

# Testar configuração
sudo nginx -t
```

## Teste Final

```bash
# Verificar se todos os serviços estão ativos
sudo systemctl status pm2-ubuntu
sudo systemctl status nginx

# Verificar processos PM2
pm2 status

# Testar aplicação
curl -I http://localhost:3000
```

## URLs de Teste

Após a correção, teste:
- **Local:** http://localhost:3000
- **Externo:** https://gestao.computacaoufj.online

## Comandos Resumidos (Execução Rápida)

```bash
# Sequência completa de correção
sudo systemctl start pm2-ubuntu
pm2 status
pm2 start ecosystem.config.js  # Se necessário
pm2 save
sudo systemctl restart nginx

# Verificar resultado
curl -I http://localhost:3000
curl -I https://gestao.computacaoufj.online
```

## Prevenção

Para evitar que o problema se repita:

```bash
# Habilitar reinicialização automática
sudo systemctl enable pm2-ubuntu

# Verificar se está habilitado
sudo systemctl is-enabled pm2-ubuntu
```

---

**Nota:** O PM2 deve mostrar status "active (running)" após a correção. Se o problema persistir, execute o script de diagnóstico completo: `./diagnostico-servidor.sh`