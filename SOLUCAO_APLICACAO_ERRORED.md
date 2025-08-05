# Solução: Aplicação PM2 com Status "Errored"

## Problema Identificado
A aplicação está com status **"errored"** e foi reiniciada **9 vezes**, indicando falha contínua na inicialização.

**Status atual:**
```
│ id │ name              │ status    │ ↺    │ pid      │
├────┼───────────────────┼───────────┼──────┼──────────┤
│ 1  │ ufj-bcc-gestao    │ errored   │ 9    │ 0        │
```

## Diagnóstico Imediato

### 1. Verificar Logs de Erro
```bash
# Ver logs da aplicação com erro
pm2 logs ufj-bcc-gestao

# Ver apenas logs de erro
pm2 logs ufj-bcc-gestao --err

# Ver logs em tempo real
pm2 logs ufj-bcc-gestao --lines 50
```

### 2. Verificar Detalhes do Processo
```bash
# Informações detalhadas do processo
pm2 describe ufj-bcc-gestao

# Monitoramento em tempo real
pm2 monit
```

## Soluções por Tipo de Erro

### Solução 1: Erro de Dependências
```bash
# Navegar para o diretório da aplicação
cd /var/www/html/gestao

# Reinstalar dependências
npm install

# Verificar se há vulnerabilidades
npm audit

# Corrigir vulnerabilidades se necessário
npm audit fix
```

### Solução 2: Erro de Configuração
```bash
# Verificar arquivo .env
cat /var/www/html/gestao/.env

# Verificar se todas as variáveis estão definidas
grep -v '^#' /var/www/html/gestao/.env.example

# Comparar com .env atual
diff /var/www/html/gestao/.env.example /var/www/html/gestao/.env
```

### Solução 3: Erro de Banco de Dados
```bash
# Verificar se o arquivo de banco existe
ls -la /var/www/html/gestao/database.db

# Verificar permissões
ls -la /var/www/html/gestao/database.db

# Corrigir permissões se necessário
sudo chown ubuntu:ubuntu /var/www/html/gestao/database.db
sudo chmod 664 /var/www/html/gestao/database.db
```

### Solução 4: Erro de Porta
```bash
# Verificar se a porta 3000 está em uso
sudo netstat -tlnp | grep :3000

# Se estiver em uso por outro processo, matar o processo
sudo kill -9 <PID>

# Ou usar porta alternativa no .env
echo "PORT=3001" >> /var/www/html/gestao/.env
```

## Reinicialização da Aplicação

### Método 1: Restart Simples
```bash
# Parar a aplicação
pm2 stop ufj-bcc-gestao

# Iniciar novamente
pm2 start ufj-bcc-gestao

# Verificar status
pm2 status
```

### Método 2: Reload Completo
```bash
# Remover processo com erro
pm2 delete ufj-bcc-gestao

# Iniciar usando ecosystem.config.js
pm2 start ecosystem.config.js

# Verificar status
pm2 status
```

### Método 3: Reinicialização Manual
```bash
# Navegar para o diretório
cd /var/www/html/gestao

# Testar aplicação manualmente
node server.js
# (Ctrl+C para parar)

# Se funcionar, iniciar com PM2
pm2 start server.js --name "ufj-bcc-gestao"
```

## Verificação de Configuração

### Verificar ecosystem.config.js
```bash
# Ver configuração atual
cat /var/www/html/gestao/ecosystem.config.js
```

**Configuração esperada:**
```javascript
module.exports = {
  apps: [{
    name: 'ufj-bcc-gestao',
    script: 'server.js',
    cwd: '/var/www/html/gestao',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### Verificar Arquivo Principal
```bash
# Verificar se server.js existe
ls -la /var/www/html/gestao/server.js

# Verificar sintaxe do arquivo
node -c /var/www/html/gestao/server.js
```

## Comandos de Teste

### Teste de Conectividade
```bash
# Após corrigir, testar localmente
curl -I http://localhost:3000

# Verificar resposta da aplicação
curl http://localhost:3000/auth/login
```

### Teste de Logs
```bash
# Monitorar logs em tempo real
pm2 logs --lines 0

# Fazer uma requisição e ver os logs
curl http://localhost:3000 &
pm2 logs --lines 5
```

## Solução de Emergência

### Se Nada Funcionar
```bash
# 1. Parar todos os processos PM2
pm2 kill

# 2. Navegar para o diretório
cd /var/www/html/gestao

# 3. Reinstalar dependências
rm -rf node_modules package-lock.json
npm install

# 4. Testar manualmente
node server.js
# (Se funcionar, Ctrl+C e continuar)

# 5. Iniciar com PM2
pm2 start ecosystem.config.js

# 6. Salvar configuração
pm2 save

# 7. Reiniciar Nginx
sudo systemctl restart nginx
```

## Erros Comuns e Soluções

### Erro: "Cannot find module"
```bash
npm install
```

### Erro: "EADDRINUSE: address already in use"
```bash
sudo netstat -tlnp | grep :3000
sudo kill -9 <PID>
```

### Erro: "ENOENT: no such file or directory"
```bash
# Verificar se todos os arquivos estão presentes
ls -la /var/www/html/gestao/
git status
git pull origin dev
```

### Erro: "Permission denied"
```bash
sudo chown -R ubuntu:ubuntu /var/www/html/gestao
sudo chmod -R 755 /var/www/html/gestao
```

## Monitoramento Contínuo

```bash
# Monitorar aplicação
pm2 monit

# Ver status detalhado
pm2 status

# Logs em tempo real
pm2 logs --lines 0
```

## Comandos Resumidos (Execução Rápida)

```bash
# Sequência de correção rápida
pm2 logs ufj-bcc-gestao --lines 20  # Ver erro
cd /var/www/html/gestao
npm install                          # Reinstalar dependências
pm2 restart ufj-bcc-gestao         # Reiniciar aplicação
pm2 status                          # Verificar status
curl -I http://localhost:3000        # Testar funcionamento
```

---

**Importante:** Sempre verifique os logs primeiro com `pm2 logs ufj-bcc-gestao` para identificar o erro específico antes de aplicar as soluções.