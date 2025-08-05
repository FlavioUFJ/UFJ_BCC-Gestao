# Solução para Erro DatabaseConfig is not defined

## Análise dos Logs PM2

Baseado nos logs do PM2, a aplicação está **funcionando corretamente** no servidor Linux, mas apresenta um erro específico durante o encerramento:

### ✅ Status Positivo
- Configurações validadas com sucesso
- Conexão com banco de dados estabelecida
- Servidor iniciado com sucesso na porta 3000
- Ambiente: production
- Aplicação rodando normalmente

### ❌ Problema Identificado

```
❌ Erro ao encerrar aplicação: ReferenceError: DatabaseConfig is not defined
    at Server.<anonymous> (/opt/nodejs/gestao/app.js:355:42)
```

## Causa do Problema

O erro ocorre na **linha 355 do arquivo app.js** durante o processo de encerramento da aplicação (SIGINT). A variável `DatabaseConfig` não está definida no escopo onde está sendo utilizada.

## Análise do Código

### Localização do Erro
- **Arquivo**: `/opt/nodejs/gestao/app.js`
- **Linha**: 355
- **Contexto**: Handler de encerramento da aplicação
- **Momento**: Durante o shutdown graceful

### Possíveis Causas
1. **Import/Require Ausente**: `DatabaseConfig` não foi importado no topo do arquivo
2. **Escopo Incorreto**: Variável definida em escopo diferente
3. **Nome Incorreto**: Referência a variável com nome errado
4. **Módulo Não Carregado**: Módulo de configuração não foi carregado

## Solução Proposta

### 1. Verificar Imports no app.js

```javascript
// No topo do arquivo app.js, verificar se existe:
const DatabaseConfig = require('./src/config/database');
// ou
const { DatabaseConfig } = require('./src/config');
// ou
import DatabaseConfig from './src/config/database.js';
```

### 2. Verificar Linha 355 do app.js

O erro provavelmente está em um handler como:

```javascript
// Linha aproximada 355 - INCORRETO
process.on('SIGINT', () => {
    console.log('🛑 Recebido sinal SIGINT. Encerrando servidor...');
    
    // ❌ DatabaseConfig não está definido aqui
    DatabaseConfig.close(); // Esta linha causa o erro
    
    process.exit(0);
});
```

### 3. Correção Sugerida

```javascript
// CORRETO - Importar no topo do arquivo
const DatabaseConfig = require('./src/config/database');

// Ou usar a instância já existente
process.on('SIGINT', async () => {
    console.log('🛑 Recebido sinal SIGINT. Encerrando servidor...');
    
    try {
        // Usar a instância correta do banco
        if (db && typeof db.close === 'function') {
            await db.close();
            console.log('✅ Conexão com banco encerrada');
        }
    } catch (error) {
        console.error('❌ Erro ao fechar banco:', error);
    }
    
    process.exit(0);
});
```

## Comandos para Diagnóstico

### 1. Verificar Estrutura do Arquivo app.js

```bash
# Ver as primeiras linhas (imports)
head -20 /opt/nodejs/gestao/app.js

# Ver a linha específica do erro
sed -n '350,360p' /opt/nodejs/gestao/app.js

# Procurar por DatabaseConfig no arquivo
grep -n "DatabaseConfig" /opt/nodejs/gestao/app.js
```

### 2. Verificar Arquivos de Configuração

```bash
# Verificar se o arquivo de config existe
ls -la /opt/nodejs/gestao/src/config/database.js

# Ver conteúdo do arquivo de configuração
cat /opt/nodejs/gestao/src/config/database.js
```

### 3. Verificar Imports e Exports

```bash
# Procurar por requires/imports relacionados ao database
grep -r "require.*database" /opt/nodejs/gestao/
grep -r "import.*database" /opt/nodejs/gestao/
```

## Correção Imediata

### Opção 1: Comentar a Linha Problemática

```bash
# Fazer backup do arquivo
cp /opt/nodejs/gestao/app.js /opt/nodejs/gestao/app.js.backup

# Editar a linha 355 para comentar o erro
sed -i '355s/^/\/\/ /' /opt/nodejs/gestao/app.js
```

### Opção 2: Adicionar Import Correto

```bash
# Adicionar import no início do arquivo
sed -i '1i const DatabaseConfig = require("./src/config/database");' /opt/nodejs/gestao/app.js
```

### Opção 3: Usar Try-Catch

```javascript
// Envolver a linha problemática em try-catch
try {
    if (typeof DatabaseConfig !== 'undefined' && DatabaseConfig.close) {
        DatabaseConfig.close();
    }
} catch (error) {
    console.error('Erro ao fechar DatabaseConfig:', error.message);
}
```

## Impacto do Erro

### ✅ Não Crítico
- A aplicação **funciona normalmente**
- O erro só ocorre durante o **encerramento**
- Não afeta o **funcionamento em produção**
- Usuários **não são impactados**

### ⚠️ Problemas Potenciais
- Conexões de banco podem não ser fechadas adequadamente
- Logs de erro desnecessários
- Shutdown não graceful

## Verificação da Correção

### 1. Teste de Encerramento

```bash
# Iniciar aplicação
pm2 start ecosystem.config.js

# Aguardar inicialização
sleep 5

# Parar aplicação e verificar logs
pm2 stop ufj-bcc-gestao
pm2 logs ufj-bcc-gestao --lines 10
```

### 2. Verificar Logs de Erro

```bash
# Verificar se o erro ainda aparece
tail -f /opt/nodejs/gestao/logs/ufj-bcc-gestao-error-0.log
```

## Warnings Adicionais

### MemoryStore Warning

Os logs também mostram:
```
Warning: connect.session() MemoryStore is not designed for a production environment
```

**Solução Futura**: Configurar um store de sessão adequado para produção (Redis, MongoDB, etc.)

### Dotenv Radar Tip

Os logs mostram uma dica sobre o Dotenv Radar <mcreference link="https://dotenvx.com/radar" index="0">0</mcreference>:
```
tip: 📡 observe env with Radar: `https://dotenvx.com/radar`
```

Esta é apenas uma dica informativa da biblioteca dotenv e não representa um erro.

## Status Atual

### ✅ Aplicação Funcionando
- Servidor rodando na porta 3000
- Banco de dados conectado
- Configurações validadas
- Ambiente de produção ativo

### 🔧 Correção Necessária
- Corrigir referência `DatabaseConfig` na linha 355 do app.js
- Implementar shutdown graceful adequado
- Considerar configurar store de sessão para produção

## Comandos Resumidos

```bash
# Verificar linha problemática
sed -n '355p' /opt/nodejs/gestao/app.js

# Fazer backup e corrigir
cp /opt/nodejs/gestao/app.js /opt/nodejs/gestao/app.js.backup

# Reiniciar PM2 após correção
pm2 restart ufj-bcc-gestao
pm2 logs ufj-bcc-gestao
```

---

**Conclusão**: A aplicação está funcionando corretamente no servidor Linux. O erro `DatabaseConfig is not defined` é um problema menor que ocorre apenas durante o encerramento e não afeta o funcionamento normal da aplicação.