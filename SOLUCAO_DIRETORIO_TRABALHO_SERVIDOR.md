# Solução para Erro de Diretório de Trabalho no Servidor Linux

## Problema Identificado

O comando `node server.js` está sendo executado no diretório errado, resultando no erro:

```
Error: Cannot find module '/home/ubuntu/server.js'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1140:15)
    ...
{ code: 'MODULE_NOT_FOUND', requireStack: [] }
```

## Causa do Problema

- **Diretório de Trabalho Incorreto**: O comando está sendo executado em `/home/ubuntu/` ao invés de `/opt/nodejs/gestao/`
- **Caminho Relativo**: O Node.js está procurando o arquivo `server.js` no diretório atual, que não é o correto
- **Configuração de Ambiente**: O usuário pode estar no diretório errado ou usando configuração inadequada

## Solução Imediata

### 1. Navegar para o Diretório Correto

```bash
# Navegar para o diretório da aplicação
cd /opt/nodejs/gestao

# Verificar se o arquivo server.js existe
ls -la server.js

# Executar o comando no diretório correto
node server.js
```

### 2. Verificar Estrutura de Diretórios

```bash
# Verificar se estamos no diretório correto
pwd

# Listar arquivos principais
ls -la | grep -E "(server.js|package.json|app.js)"

# Verificar permissões
ls -la server.js
```

### 3. Usar Caminho Absoluto (Alternativa)

```bash
# Executar com caminho absoluto
node /opt/nodejs/gestao/server.js

# Ou definir diretório de trabalho
cd /opt/nodejs/gestao && node server.js
```

## Processo Completo de Correção

### Passo 1: Verificar Localização Atual

```bash
# Verificar diretório atual
pwd

# Verificar se estamos em /home/ubuntu
if [ "$(pwd)" = "/home/ubuntu" ]; then
    echo "❌ Diretório incorreto: $(pwd)"
    echo "✅ Deve estar em: /opt/nodejs/gestao"
fi
```

### Passo 2: Navegar para Diretório Correto

```bash
# Navegar para o diretório da aplicação
cd /opt/nodejs/gestao

# Confirmar localização
echo "📍 Diretório atual: $(pwd)"
```

### Passo 3: Verificar Arquivos da Aplicação

```bash
# Verificar se os arquivos principais existem
echo "📁 Verificando arquivos principais:"
ls -la server.js package.json app.js 2>/dev/null || echo "❌ Alguns arquivos não encontrados"

# Verificar estrutura do projeto
echo "📂 Estrutura do projeto:"
ls -la
```

### Passo 4: Executar a Aplicação

```bash
# Executar no diretório correto
echo "🚀 Iniciando aplicação..."
node server.js
```

## Configuração Permanente

### 1. Criar Alias no Bashrc

```bash
# Adicionar ao ~/.bashrc
echo 'alias gestao="cd /opt/nodejs/gestao"' >> ~/.bashrc
echo 'alias start-gestao="cd /opt/nodejs/gestao && node server.js"' >> ~/.bashrc

# Recarregar bashrc
source ~/.bashrc
```

### 2. Criar Script de Inicialização

```bash
# Criar script start.sh
cat > /opt/nodejs/gestao/start.sh << 'EOF'
#!/bin/bash
cd /opt/nodejs/gestao
echo "📍 Diretório: $(pwd)"
echo "🚀 Iniciando UFJ BCC Gestão..."
node server.js
EOF

# Dar permissão de execução
chmod +x /opt/nodejs/gestao/start.sh
```

### 3. Configurar PM2 com Diretório Correto

```bash
# Verificar configuração do PM2
cat /opt/nodejs/gestao/ecosystem.config.js | grep -A 5 -B 5 cwd

# O cwd deve estar configurado como:
# cwd: '/opt/nodejs/gestao'
```

## Verificação da Correção

### 1. Teste de Diretório

```bash
# Script de verificação
echo "=== VERIFICAÇÃO DE DIRETÓRIO ==="
echo "Diretório atual: $(pwd)"
echo "Diretório esperado: /opt/nodejs/gestao"

if [ "$(pwd)" = "/opt/nodejs/gestao" ]; then
    echo "✅ Diretório correto"
else
    echo "❌ Diretório incorreto"
    echo "Execute: cd /opt/nodejs/gestao"
fi
```

### 2. Teste de Arquivos

```bash
# Verificar arquivos essenciais
echo "=== VERIFICAÇÃO DE ARQUIVOS ==="
for file in server.js package.json app.js; do
    if [ -f "$file" ]; then
        echo "✅ $file encontrado"
    else
        echo "❌ $file não encontrado"
    fi
done
```

### 3. Teste de Execução

```bash
# Teste rápido (sair após 5 segundos)
echo "=== TESTE DE EXECUÇÃO ==="
timeout 5s node server.js && echo "✅ Aplicação iniciou corretamente" || echo "❌ Erro na inicialização"
```

## Comandos de Diagnóstico

### Verificar Ambiente

```bash
# Informações do ambiente
echo "Usuário: $(whoami)"
echo "Diretório home: $HOME"
echo "Diretório atual: $(pwd)"
echo "PATH: $PATH"
```

### Verificar Node.js

```bash
# Versões instaladas
echo "Node.js: $(node --version)"
echo "NPM: $(npm --version)"
echo "PM2: $(pm2 --version 2>/dev/null || echo 'não instalado')"
```

### Verificar Permissões

```bash
# Permissões do diretório
ls -ld /opt/nodejs/gestao
ls -la /opt/nodejs/gestao/server.js

# Verificar se o usuário tem acesso
test -r /opt/nodejs/gestao/server.js && echo "✅ Arquivo legível" || echo "❌ Sem permissão de leitura"
```

## Prevenção Futura

### 1. Sempre Verificar Diretório

```bash
# Antes de executar comandos, sempre verificar:
pwd
ls server.js
```

### 2. Usar Caminhos Absolutos

```bash
# Preferir caminhos absolutos em scripts
node /opt/nodejs/gestao/server.js
```

### 3. Configurar Variáveis de Ambiente

```bash
# Adicionar ao ~/.bashrc
export GESTAO_DIR="/opt/nodejs/gestao"
export PATH="$GESTAO_DIR:$PATH"
```

## Estrutura Esperada

```
/opt/nodejs/gestao/
├── server.js          # ✅ Arquivo principal
├── app.js             # ✅ Aplicação Express
├── package.json       # ✅ Dependências
├── ecosystem.config.js # ✅ Configuração PM2
├── database.db        # ✅ Banco SQLite
├── node_modules/      # ✅ Dependências instaladas
└── src/               # ✅ Código fonte
```

## Comandos Resumidos

```bash
# Solução rápida
cd /opt/nodejs/gestao
node server.js

# Verificação completa
cd /opt/nodejs/gestao && pwd && ls server.js && node server.js

# Com PM2
cd /opt/nodejs/gestao && pm2 start ecosystem.config.js
```

---

**Nota**: Este erro é comum quando comandos são executados no diretório errado. Sempre verifique o diretório atual com `pwd` antes de executar `node server.js`.