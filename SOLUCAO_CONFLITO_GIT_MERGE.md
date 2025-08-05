# Solução: Conflito Git Merge - Alterações Locais

## Problema Identificado

Ao executar `git pull origin dev` no servidor, o sistema apresentou o seguinte erro:

```
error: Your local changes to the following files would be overwritten by merge:
        package-lock.json
        package.json
Please commit your changes or stash them before you merge.
Aborting
```

## Causa do Problema

O servidor possui **alterações locais** nos arquivos `package.json` e `package-lock.json` que não foram commitadas. Essas alterações provavelmente ocorreram devido a:

1. **Instalação/remoção de dependências** no servidor
2. **Reinstalação de dependências nativas** (sqlite3, bcrypt)
3. **Atualizações automáticas** do npm
4. **Diferenças de versão** entre desenvolvimento e produção

## Soluções Disponíveis

### Opção 1: Stash (Recomendada)
**Preserva as alterações locais temporariamente**

```bash
# Salvar alterações locais temporariamente
git stash push -m "Alterações locais package.json/package-lock.json"

# Fazer o pull das atualizações
git pull origin dev

# Verificar se há conflitos ao restaurar
git stash pop

# Se houver conflitos, resolver manualmente
# Caso contrário, as alterações locais são mantidas
```

### Opção 2: Reset Hard (Cuidado!)
**Descarta completamente as alterações locais**

```bash
# ⚠️ ATENÇÃO: Isso apaga TODAS as alterações locais!
git reset --hard HEAD

# Fazer o pull das atualizações
git pull origin dev

# Reinstalar dependências se necessário
npm install
```

### Opção 3: Commit Local
**Commita as alterações locais primeiro**

```bash
# Adicionar alterações ao staging
git add package.json package-lock.json

# Fazer commit das alterações locais
git commit -m "Alterações locais de dependências no servidor"

# Fazer o pull (pode gerar conflitos de merge)
git pull origin dev

# Resolver conflitos se necessário
```

## Solução Recomendada (Passo a Passo)

### 1. Verificar Status Atual
```bash
cd /opt/nodejs/gestao
git status
git diff package.json
git diff package-lock.json
```

### 2. Salvar Alterações Locais
```bash
git stash push -m "Dependências locais antes do pull"
```

### 3. Atualizar do Repositório
```bash
git pull origin dev
```

### 4. Restaurar Alterações (se necessário)
```bash
# Verificar se as dependências estão corretas
npm list --depth=0

# Se precisar das alterações locais:
git stash pop

# Resolver conflitos manualmente se aparecerem
```

### 5. Reinstalar Dependências
```bash
# Garantir que todas as dependências estão corretas
npm install

# Verificar vulnerabilidades
npm audit
```

## Verificação Pós-Solução

### 1. Confirmar Atualização
```bash
git log --oneline -5
git status
```

### 2. Testar Dependências
```bash
# Verificar se sqlite3 funciona
node -e "console.log(require('sqlite3'))"

# Verificar se bcrypt funciona
node -e "console.log(require('bcrypt'))"
```

### 3. Iniciar Aplicação
```bash
# Parar PM2 se estiver rodando
pm2 stop ufj-bcc-gestao
pm2 delete ufj-bcc-gestao

# Iniciar com nova configuração
pm2 start ecosystem.config.js

# Verificar status
pm2 status
pm2 logs ufj-bcc-gestao
```

## Prevenção Futura

### 1. Evitar Alterações Diretas no Servidor
- **Não instalar** dependências diretamente no servidor
- **Sempre fazer** alterações no ambiente de desenvolvimento
- **Commitar** mudanças antes de fazer deploy

### 2. Usar .gitignore Adequado
```gitignore
# Dependências
node_modules/

# Logs
logs/
*.log

# Arquivos de ambiente
.env
.env.local
.env.production

# Arquivos temporários
temp/
uploads/temp/

# Banco de dados local
*.db
*.sqlite
*.sqlite3
```

### 3. Processo de Deploy Recomendado
```bash
# 1. No desenvolvimento
git add .
git commit -m "Descrição das alterações"
git push origin dev

# 2. No servidor
cd /opt/nodejs/gestao
git stash  # Se houver alterações locais
git pull origin dev
npm install  # Apenas se package.json mudou
pm2 restart ufj-bcc-gestao
```

## Arquivos Relacionados

- `package.json` - Dependências do projeto
- `package-lock.json` - Lock file das versões
- `ecosystem.config.js` - Configuração PM2 (atualizada)
- `.gitignore` - Arquivos ignorados pelo Git

## Comandos de Diagnóstico

```bash
# Verificar alterações locais
git status
git diff

# Verificar histórico
git log --oneline -10

# Verificar stash
git stash list

# Verificar dependências
npm list --depth=0
npm outdated
```

## Status da Solução

- ✅ Problema identificado: Conflito de merge
- ✅ Soluções documentadas: Stash, Reset, Commit
- ✅ Processo recomendado: Stash + Pull + Verificação
- ⏳ Aguardando aplicação no servidor
- ⏳ Teste do PM2 após resolução

---

**Documentação criada em:** 05/08/2025  
**Problema:** Conflito Git merge com alterações locais  
**Status:** ✅ Documentado  
**Próximo passo:** Aplicar solução no servidor