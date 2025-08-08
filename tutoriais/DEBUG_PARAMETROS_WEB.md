# Debug - Problema de Parâmetros na Versão Web

## Problema Identificado
Os parâmetros para a tela de cadastro "Plano de Atividade" não estão sendo recuperados na versão web, mas funcionam corretamente na versão local.

## Análise Realizada

### Rotas Funcionando Localmente
- `/parametro/buscar?identificador=Apólice de Seguro` - ✅ Funcionando
- `/parametro/buscar-valor` - ✅ Funcionando
- `/secure/parametros/buscar` - ✅ Funcionando (após correção)

### Correções Implementadas

1. **Correção na Rota Segura** (`routes/secure-routes.js`)
   - Alterado parâmetro de `nome` para `identificador` na linha 587
   - Mantém consistência com outras rotas de parâmetros

2. **Logs de Debug Adicionados**
   - `ParametroController.js`: Logs detalhados nos métodos `buscar` e `buscarValorEspecifico`
   - `middleware/parametro-debug.js`: Middleware específico para debug de rotas de parâmetros
   - Aplicado nas rotas públicas `/parametro/buscar` e `/parametro/buscar-valor`

### Possíveis Causas do Problema na Versão Web

1. **Configuração de Ambiente**
   - `NODE_ENV=production` ativa configurações mais restritivas
   - CORS limitado a origens específicas
   - Cookies seguros (HTTPS obrigatório)

2. **Autenticação/Sessão**
   - Rotas de parâmetros são públicas (sem `requireAuth`)
   - Possível problema com cookies de sessão em HTTPS

3. **Rate Limiting**
   - Limite de 100 requests/15min em produção vs 1000 em desenvolvimento

### Como Debugar na Versão Web

1. **Verificar Logs do Servidor**
   ```bash
   # Verificar logs em tempo real
   tail -f /var/log/aplicacao.log
   
   # Ou se usando PM2
   pm2 logs
   ```

2. **Testar Rotas Diretamente**
   ```bash
   # Testar rota de parâmetros
   curl "https://seu-dominio.com/parametro/buscar?identificador=Apólice de Seguro"
   
   # Testar rota segura
   curl "https://seu-dominio.com/secure/parametros/buscar?identificador=Apólice de Seguro"
   ```

3. **Verificar Console do Navegador**
   - Abrir DevTools (F12)
   - Verificar aba Network para requisições falhando
   - Verificar aba Console para erros JavaScript

### Logs Esperados

Com os logs implementados, você deve ver no console do servidor:

```
[PARAMETRO-DEBUG] =================================
[PARAMETRO-DEBUG] Requisição para rota de parâmetro
[PARAMETRO-DEBUG] URL: /parametro/buscar?identificador=Apólice de Seguro
[PARAMETRO-CONTROLLER] Iniciando busca de parâmetro
[PARAMETRO-CONTROLLER] Environment: production
[PARAMETRO-CONTROLLER] Identificador recebido: Apólice de Seguro
```

### Próximos Passos

1. **Deploy das Correções**
   - Fazer commit e push das alterações
   - Deploy na versão web

2. **Monitorar Logs**
   - Verificar se os logs aparecem quando acessar a tela
   - Identificar onde exatamente está falhando

3. **Possíveis Soluções Adicionais**
   - Se problema for CORS: ajustar configuração em `app.js`
   - Se problema for sessão: verificar configuração de cookies
   - Se problema for rate limiting: ajustar limites

### Arquivos Modificados

- `routes/secure-routes.js` - Correção do parâmetro
- `src/controllers/ParametroController.js` - Logs de debug
- `middleware/parametro-debug.js` - Middleware de debug (novo)
- `src/routes/parametros.js` - Aplicação do middleware de debug

### Comandos para Reverter (se necessário)

```bash
# Remover middleware de debug
git checkout HEAD -- src/routes/parametros.js

# Remover arquivo de debug
rm middleware/parametro-debug.js

# Reverter logs no controller (manter apenas a correção essencial)
git checkout HEAD -- src/controllers/ParametroController.js
```