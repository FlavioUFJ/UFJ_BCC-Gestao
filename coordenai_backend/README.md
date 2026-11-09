# coordenai_backend

API REST do CoordenAI (Node.js + Express + MariaDB/MySQL). Não serve páginas:
a interface é o projeto [`coordenai_frontend`](../coordenai_frontend).

O código de negócio (controllers, services, models, validadores, SQL, PDFs,
e-mail) veio do legado sem reescrita. O que mudou está em
[`docs/PLANO-MIGRACAO.md`](../docs/PLANO-MIGRACAO.md).

## Executar

```bash
cp .env.example .env      # preencher banco e SESSION_SECRET
npm install
npm run dev               # desenvolvimento (porta 3001)
npm start                 # produção
npm test                  # testes (não precisam de banco)
```

Todas as rotas ficam sob `/api`. Verificação rápida: `GET /api/health`.

## Como a API responde

- Sempre JSON. Sem login: `401 { code: "NAO_AUTENTICADO" }`. Sem permissão: `403`.
- Autenticação por sessão (cookie `gestao.sid`, o mesmo do legado).
- Requisições que alteram dados exigem o cabeçalho `X-XSRF-TOKEN` com o valor
  do cookie `XSRF-TOKEN` (o Angular faz isso sozinho).
- Os caminhos são os do legado com o prefixo `/api`
  (ex.: `/secure/pessoas/buscar` → `/api/secure/pessoas/buscar`).

### Dados das telas de formulário

Vários métodos herdados têm dois ramos: JSON para chamadas AJAX e
`res.render` para páginas. O middleware `src/middleware/api-adapter.js` faz
toda requisição seguir pelo ramo JSON e converte em JSON os `render`/`redirect`
que restarem.

Quando o ramo de página entrega mais dados (listas que preenchiam um
formulário, por exemplo), envie o cabeçalho `X-View-Data: 1`: a resposta traz
em `data` o que seria passado à view.

```bash
curl -b cookies.txt -H 'X-View-Data: 1' \
  'http://localhost:3001/api/planos-atividade/create?campo_estagio_id=10'
```

## Estrutura

```
app.js                      montagem do Express (createApp) e inicialização
server.js                   ponto de entrada
src/config/                 banco (variáveis DB_*), sessão, e-mail, Puppeteer
src/middleware/auth.js      autenticação e autorização (implementação única)
src/middleware/api-adapter.js, csrf.js
src/routes/                 rotas por recurso; secure.js = antigo routes/secure-routes.js
src/controllers/ services/ models/ validators/ utils/
database/                   índices, migrações e scripts SQL
tests/                      testes de fumaça e das peças novas
storage/uploads/            arquivos enviados (fora do Git; ver UPLOADS_DIR)
```

## Convivência com o legado

Os dois backends usam o mesmo banco. Para que o login valha nos dois:

- mesmo `SESSION_SECRET` e mesmo `SESSION_COOKIE_NAME` do legado;
- `UPLOADS_DIR` apontando para a pasta `public/uploads` do legado.

## Publicação

`ecosystem.config.example.js` traz a configuração do PM2. Atualizar o backend
é `pm2 reload coordenai-backend`; o frontend não é afetado.
