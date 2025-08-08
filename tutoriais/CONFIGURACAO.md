# Configuração do Ambiente de Desenvolvimento

## Arquivos de Configuração Necessários

Este projeto utiliza arquivos de configuração que contêm informações sensíveis e não estão incluídos no controle de versão por motivos de segurança.

### 1. Configuração do Banco de Dados

**Arquivo:** `dadosConexaoSGDB.js`

1. Copie o arquivo de exemplo:
   ```bash
   cp dadosConexaoSGDB.example.js dadosConexaoSGDB.js
   ```

2. Edite o arquivo `dadosConexaoSGDB.js` com suas credenciais:
   ```javascript
   module.exports = {
       host: 'localhost',
       port: 3306,
       user: 'seu_usuario',
       password: 'sua_senha',
       database: 'gestao_bccufj',
       // ... outras configurações
   };
   ```

### 2. Variáveis de Ambiente

**Arquivo:** `.env`

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```

2. Configure as variáveis necessárias no arquivo `.env`

### 3. Configuração PM2 (Produção)

**Arquivo:** `ecosystem.config.js`

Para ambiente de produção, crie o arquivo `ecosystem.config.js` baseado nas necessidades do servidor.

## Scripts de Produção

Os seguintes scripts foram removidos do controle de versão por conterem informações sensíveis:
- `deploy.sh` - Script de deploy
- `corrigir-database-producao.sh` - Correção de banco em produção
- `diagnostico-servidor.sh` - Diagnóstico do servidor
- `fix-git-ownership-producao.sh` - Correção de permissões Git
- `setup-server.sh` - Configuração inicial do servidor
- `ecosystem.config.js` - Configuração PM2

### Scripts Disponíveis

#### `deploy-servidor.sh`
Script para deploy automático no servidor de aplicação:
- Faz backup da aplicação atual
- Puxa a versão mais recente do GitHub
- Sobrescreve alterações locais (força atualização)
- Instala dependências
- Configura ambiente de produção
- Reinicia serviços

#### `monitor-servidor.sh`
Script para monitoramento e diagnóstico:
- `./monitor-servidor.sh status` - Status geral da aplicação
- `./monitor-servidor.sh logs` - Logs recentes
- `./monitor-servidor.sh pm2` - Status detalhado PM2
- `./monitor-servidor.sh db` - Teste de conexão com banco
- `./monitor-servidor.sh health` - Verificação completa
- `./monitor-servidor.sh restart` - Reinicia aplicação
- `./monitor-servidor.sh stop` - Para aplicação
- `./monitor-servidor.sh start` - Inicia aplicação

## Arquivos Ignorados pelo Git

Os seguintes tipos de arquivos são automaticamente ignorados pelo Git:

- **Configurações sensíveis:** `.env`, `dadosConexaoSGDB.js`
- **Logs:** `logs/`, `*.log`
- **Backups:** `backups/`, `*.db`, `*.sql.backup`
- **Uploads:** `uploads/`, `temp/`
- **Scripts de produção:** `deploy.sh`, `setup-server.sh`, etc.
- **Arquivos de teste:** `test_*.js`, `test-*.html`
- **Dependências:** `node_modules/`, `package-lock.json`

## Segurança

⚠️ **IMPORTANTE:** Nunca commite arquivos que contenham:
- Credenciais de banco de dados
- Chaves secretas
- Senhas
- Tokens de API
- Configurações específicas do servidor de produção

## Instalação

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Configure os arquivos conforme descrito acima
4. Execute: `npm start`

## Contribuição

Antes de fazer commit, verifique se não está incluindo arquivos sensíveis:

```bash
git status
# Verifique se apenas arquivos seguros estão sendo commitados
```