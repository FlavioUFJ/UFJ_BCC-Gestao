# Solução para Erro SQLite3 no Servidor Linux

## Problema Identificado

O servidor Linux está apresentando erro de arquitetura incompatível com o SQLite3:

```
Error: /opt/nodejs/gestao/node_modules/sqlite3/build/Release/node_sqlite3.node: invalid ELF header
    at Module._extensions..node (node:internal/modules/cjs/loader:1460:18)
    ...
{ code: 'ERR_DLOPEN_FAILED' }
```

## Causa do Problema

- **Incompatibilidade de Arquitetura**: O módulo `sqlite3` foi compilado para uma arquitetura diferente (provavelmente Windows x64) e está sendo executado em Linux
- **Dependências Nativas**: O SQLite3 contém código nativo (binário) que precisa ser recompilado para a arquitetura do servidor
- **Cross-Platform Issues**: Transferência de `node_modules` entre sistemas operacionais diferentes

## Solução Recomendada

### 1. Remover node_modules e Reinstalar

```bash
# No servidor Linux (/opt/nodejs/gestao)
cd /opt/nodejs/gestao

# Remover completamente node_modules
rm -rf node_modules
rm -f package-lock.json

# Limpar cache do npm
npm cache clean --force

# Reinstalar todas as dependências
npm install
```

### 2. Reinstalação Específica do SQLite3

```bash
# Alternativa: reinstalar apenas o sqlite3
npm uninstall sqlite3
npm install sqlite3 --build-from-source
```

### 3. Verificar Arquitetura do Sistema

```bash
# Verificar arquitetura do sistema
uname -m
node -p "process.arch"
node -p "process.platform"
```

### 4. Compilação Forçada

```bash
# Se necessário, forçar recompilação
npm rebuild sqlite3
```

## Processo Completo de Correção

### Passo 1: Backup e Preparação

```bash
# Fazer backup do banco de dados
cp /opt/nodejs/gestao/database.db /opt/nodejs/gestao/database.db.backup

# Parar PM2
pm2 stop ufj-bcc-gestao
pm2 delete ufj-bcc-gestao
```

### Passo 2: Limpeza Completa

```bash
cd /opt/nodejs/gestao

# Remover node_modules
rm -rf node_modules
rm -f package-lock.json

# Limpar cache
npm cache clean --force
```

### Passo 3: Reinstalação

```bash
# Reinstalar dependências
npm install

# Verificar se sqlite3 foi instalado corretamente
ls -la node_modules/sqlite3/build/Release/
```

### Passo 4: Teste Manual

```bash
# Testar a aplicação manualmente
node server.js
```

### Passo 5: Reiniciar PM2

```bash
# Se o teste manual funcionar
pm2 start ecosystem.config.js
pm2 status
pm2 logs ufj-bcc-gestao
```

## Alternativas se o Problema Persistir

### Opção 1: Usar node-gyp

```bash
# Instalar node-gyp globalmente
npm install -g node-gyp

# Recompilar sqlite3
cd /opt/nodejs/gestao/node_modules/sqlite3
node-gyp rebuild
```

### Opção 2: Instalar Dependências de Sistema

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install build-essential python3

# CentOS/RHEL
sudo yum groupinstall "Development Tools"
sudo yum install python3
```

### Opção 3: Usar Versão Específica

```bash
# Instalar versão específica do sqlite3
npm install sqlite3@5.1.6 --build-from-source
```

## Verificação da Correção

### 1. Teste de Conexão com Banco

```javascript
// test_sqlite3.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
    db.get("SELECT name FROM sqlite_master WHERE type='table'", (err, row) => {
        if (err) {
            console.error('Erro SQLite3:', err);
        } else {
            console.log('✓ SQLite3 funcionando corretamente');
            console.log('Primeira tabela:', row);
        }
        db.close();
    });
});
```

### 2. Verificar Arquivos Binários

```bash
# Verificar se o arquivo binário existe e é válido
file /opt/nodejs/gestao/node_modules/sqlite3/build/Release/node_sqlite3.node
ldd /opt/nodejs/gestao/node_modules/sqlite3/build/Release/node_sqlite3.node
```

## Prevenção Futura

1. **Não Transferir node_modules**: Sempre usar `.gitignore` para excluir `node_modules`
2. **Usar npm ci**: Em produção, usar `npm ci` ao invés de `npm install`
3. **Documentar Arquitetura**: Manter registro da arquitetura do servidor
4. **Scripts de Deploy**: Criar scripts automatizados que incluam reinstalação de dependências

## Comandos de Diagnóstico

```bash
# Verificar versão do Node.js
node --version
npm --version

# Verificar arquitetura
uname -a
node -p "process.arch + ' ' + process.platform"

# Verificar dependências nativas
npm ls sqlite3
npm ls bcrypt

# Verificar logs detalhados
npm install sqlite3 --verbose
```

## Estrutura Esperada Após Correção

```
/opt/nodejs/gestao/
├── node_modules/
│   └── sqlite3/
│       └── build/
│           └── Release/
│               └── node_sqlite3.node  # Binário Linux válido
├── database.db
├── server.js
└── package.json
```

---

**Nota**: Este erro é comum ao transferir projetos Node.js entre diferentes sistemas operacionais. A solução sempre envolve recompilar as dependências nativas para a arquitetura de destino.