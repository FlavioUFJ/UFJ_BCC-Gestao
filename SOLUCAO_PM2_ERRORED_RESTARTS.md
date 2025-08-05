# Solução: PM2 Errored - Muitos Restarts Instáveis

## Problema Identificado

A aplicação `ufj-bcc-gestao` está em estado **errored** no PM2 com as seguintes características:

```
│ 0  │ ufj-bcc-gestao    │ default     │ 1.0.0   │ cluster │ 0        │ 0      │ 18   │ errored   │ 0%       │ 0b       │ ubuntu   │ disabled │
```

**Mensagem crítica:**
```
Script /opt/nodejs/gestao/server.js had too many unstable restarts (10). Stopped. "errored"
```

## Análise do Problema

### 1. **Padrão de Restart Rápido**
O log mostra um padrão de:
- App online → Disconnected → Exited with code [0] → Starting → Online
- Ciclo repetindo rapidamente (dentro de segundos)
- 18 restarts totais, 10 considerados "instáveis"

### 2. **Saída com Código 0**
- `exited with code [0]` indica saída "limpa" (sem erro)
- Sugere que a aplicação está terminando intencionalmente
- Não é um crash, mas sim uma finalização controlada

### 3. **Logs Disponíveis**
- **Error log:** Vazio (sem erros específicos)
- **Output log:** Apenas mensagens do dotenv sendo carregado
- Não há logs da aplicação Node.js propriamente dita

## Possíveis Causas

### 1. **Problema de Configuração PM2**
```javascript
// ecosystem.config.js pode ter configuração inadequada
{
  instances: 1,        // ✅ Correto
  exec_mode: 'cluster' // ❓ Pode ser problemático com instances: 1
}
```

### 2. **Arquivo .env Ausente ou Inválido**
- Dotenv carrega 16 variáveis, mas pode faltar alguma crítica
- Aplicação pode estar terminando por falta de configuração

### 3. **Dependências Nativas**
- sqlite3 ou bcrypt podem ter problemas de arquitetura
- Aplicação termina ao tentar carregar módulos nativos

### 4. **Porta em Uso**
- Porta 3000 pode estar ocupada
- Aplicação termina ao não conseguir fazer bind

### 5. **Permissões de Arquivo**
- Problemas de acesso a arquivos/diretórios
- Database, logs, uploads podem estar inacessíveis

## Soluções Propostas

### Solução 1: Verificar Configuração PM2

```bash
# Parar e deletar aplicação atual
pm2 stop ufj-bcc-gestao
pm2 delete ufj-bcc-gestao

# Verificar configuração
cat ecosystem.config.js

# Iniciar em modo fork (não cluster)
pm2 start server.js --name ufj-bcc-gestao --no-autorestart
```

### Solução 2: Teste Manual da Aplicação

```bash
# Ir para diretório
cd /opt/nodejs/gestao

# Testar execução direta
node server.js

# Se funcionar, problema é no PM2
# Se não funcionar, problema é na aplicação
```

### Solução 3: Verificar Dependências

```bash
# Verificar se módulos nativos funcionam
node -e "console.log('sqlite3:', require('sqlite3')); console.log('bcrypt:', require('bcrypt'));"

# Reinstalar se necessário
npm rebuild sqlite3 bcrypt
```

### Solução 4: Verificar Arquivo .env

```bash
# Verificar se existe
ls -la .env

# Verificar conteúdo (sem mostrar senhas)
grep -v PASSWORD .env | grep -v SECRET

# Copiar do exemplo se necessário
cp .env.example .env
```

### Solução 5: Verificar Porta e Processos

```bash
# Verificar se porta 3000 está em uso
sudo netstat -tlnp | grep :3000
sudo lsof -i :3000

# Matar processo se necessário
sudo kill -9 <PID>
```

### Solução 6: Verificar Permissões

```bash
# Verificar propriedade dos arquivos
ls -la /opt/nodejs/gestao/

# Corrigir permissões se necessário
sudo chown -R ubuntu:ubuntu /opt/nodejs/gestao/
sudo chmod -R 755 /opt/nodejs/gestao/

# Verificar diretórios críticos
mkdir -p logs uploads/temp
chmod 755 logs uploads uploads/temp
```

## Processo de Diagnóstico Recomendado

### Passo 1: Teste Manual
```bash
cd /opt/nodejs/gestao
node server.js
```

### Passo 2: Se Funcionar Manualmente
```bash
# Problema é no PM2 - ajustar configuração
pm2 start server.js --name ufj-bcc-gestao --watch false
```

### Passo 3: Se Não Funcionar Manualmente
```bash
# Verificar logs detalhados
DEBUG=* node server.js

# Ou verificar dependências
npm list --depth=0
```

### Passo 4: Configuração PM2 Alternativa

```javascript
// ecosystem.config.js - versão simplificada
module.exports = {
  apps: [{
    name: 'ufj-bcc-gestao',
    script: 'server.js',
    cwd: '/opt/nodejs/gestao',
    instances: 1,
    exec_mode: 'fork',  // Mudança: fork em vez de cluster
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    min_uptime: '30s',  // Mudança: mais tempo para considerar estável
    max_restarts: 5,    // Mudança: menos tentativas
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

## Comandos de Monitoramento

```bash
# Monitorar em tempo real
pm2 monit

# Logs detalhados
pm2 logs ufj-bcc-gestao --lines 50

# Status detalhado
pm2 show ufj-bcc-gestao

# Reiniciar com logs
pm2 restart ufj-bcc-gestao && pm2 logs ufj-bcc-gestao
```

## Arquivos para Verificar

- `/opt/nodejs/gestao/.env` - Variáveis de ambiente
- `/opt/nodejs/gestao/server.js` - Arquivo principal
- `/opt/nodejs/gestao/package.json` - Dependências
- `/opt/nodejs/gestao/ecosystem.config.js` - Configuração PM2
- `/opt/nodejs/gestao/database.db` - Banco de dados

## Status da Investigação

- ✅ Problema identificado: Restarts instáveis
- ✅ Padrão analisado: Saída limpa (código 0)
- ✅ Soluções propostas: 6 abordagens diferentes
- ⏳ Aguardando teste manual: `node server.js`
- ⏳ Aguardando ajuste de configuração PM2

---

**Documentação criada em:** 05/08/2025  
**Problema:** PM2 errored - muitos restarts instáveis  
**Status:** ✅ Analisado  
**Próximo passo:** Teste manual da aplicação