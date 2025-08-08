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