# Correção: Configuração PM2 - Atualização de Diretórios

## Problema Identificado

Ao executar `pm2 start ecosystem.config.js`, o sistema apresentou o seguinte erro:

```
[PM2][WARN] Applications ufj-bcc-gestao not running, starting...
[PM2][ERROR] Error: Script not found: /var/www/html/gestao/server.js
```

## Causa do Problema

O arquivo `ecosystem.config.js` estava configurado com os diretórios antigos:
- **Diretório de trabalho:** `/var/www/html/gestao`
- **Logs:** `/home/ubuntu/logs/`

Esses caminhos não seguem as **novas diretrizes de diretórios Node.js** estabelecidas no documento `DIRETORIOS_NODEJS.md`.

## Solução Aplicada

### Configuração Anterior (Incorreta)
```javascript
module.exports = {
  apps: [{
    name: 'ufj-bcc-gestao',
    script: 'server.js',
    cwd: '/var/www/html/gestao',  // ❌ Diretório antigo
    // ...
    log_file: '/home/ubuntu/logs/ufj-bcc-gestao.log',      // ❌ Logs externos
    out_file: '/home/ubuntu/logs/ufj-bcc-gestao-out.log',   // ❌ Logs externos
    error_file: '/home/ubuntu/logs/ufj-bcc-gestao-error.log' // ❌ Logs externos
  }]
};
```

### Configuração Corrigida (Nova)
```javascript
module.exports = {
  apps: [{
    name: 'ufj-bcc-gestao',
    script: 'server.js',
    cwd: '/opt/nodejs/gestao',  // ✅ Novo diretório recomendado
    // ...
    log_file: '/opt/nodejs/gestao/logs/ufj-bcc-gestao.log',      // ✅ Logs internos
    out_file: '/opt/nodejs/gestao/logs/ufj-bcc-gestao-out.log',   // ✅ Logs internos
    error_file: '/opt/nodejs/gestao/logs/ufj-bcc-gestao-error.log' // ✅ Logs internos
  }]
};
```

## Vantagens da Nova Configuração

### 1. **Conformidade com Diretrizes**
- Segue as recomendações do `DIRETORIOS_NODEJS.md`
- Usa `/opt/nodejs/gestao` como diretório padrão para produção

### 2. **Organização Melhorada**
- Logs centralizados dentro do diretório da aplicação
- Estrutura mais limpa e organizada
- Facilita backup e manutenção

### 3. **Segurança Aprimorada**
- Diretório `/opt/nodejs/` com permissões adequadas
- Isolamento melhor da aplicação
- Reduz riscos de segurança

### 4. **Compatibilidade**
- Funciona com proxy reverso Apache
- Compatível com diferentes ambientes (produção/desenvolvimento)
- Facilita migração entre servidores

## Comandos para Aplicar a Correção

### 1. Parar PM2 (se estiver rodando)
```bash
pm2 stop ufj-bcc-gestao
pm2 delete ufj-bcc-gestao
```

### 2. Criar Diretório de Logs
```bash
sudo mkdir -p /opt/nodejs/gestao/logs
sudo chown -R ubuntu:ubuntu /opt/nodejs/gestao/logs
```

### 3. Iniciar com Nova Configuração
```bash
cd /opt/nodejs/gestao
pm2 start ecosystem.config.js
```

### 4. Verificar Status
```bash
pm2 status
pm2 logs ufj-bcc-gestao
```

## Estrutura de Diretórios Resultante

```
/opt/nodejs/gestao/
├── server.js
├── package.json
├── ecosystem.config.js
├── src/
├── public/
├── views/
├── logs/                    # ✅ Novo diretório de logs
│   ├── ufj-bcc-gestao.log
│   ├── ufj-bcc-gestao-out.log
│   └── ufj-bcc-gestao-error.log
└── ...
```

## Verificação da Correção

Após aplicar a correção, o PM2 deve:
1. ✅ Encontrar o arquivo `server.js` em `/opt/nodejs/gestao/server.js`
2. ✅ Criar logs no diretório `/opt/nodejs/gestao/logs/`
3. ✅ Iniciar a aplicação sem erros
4. ✅ Manter a aplicação rodando com autorestart

## Arquivos Relacionados

- `ecosystem.config.js` - Configuração do PM2 (corrigida)
- `DIRETORIOS_NODEJS.md` - Diretrizes de diretórios
- `INSTALACAO_MANUAL_APACHE.md` - Guia de instalação

## Status

- ✅ Configuração PM2 corrigida
- ✅ Diretórios atualizados para `/opt/nodejs/gestao`
- ✅ Logs centralizados na aplicação
- ✅ Compatível com novas diretrizes
- ⏳ Aguardando teste em ambiente de produção

---

**Documentação criada em:** 05/08/2025  
**Problema:** Configuração PM2 com diretórios antigos  
**Status:** ✅ Corrigido  
**Próximo passo:** Testar `pm2 start ecosystem.config.js` no servidor