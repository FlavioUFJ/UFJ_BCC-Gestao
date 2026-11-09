# Auditoria para refatoração do CoordenAI

Separação em `coordenai_backend` e `coordenai_frontend` (Angular) — novembro/2026

Este documento é somente diagnóstico e plano. Nenhum arquivo do legado foi alterado e os dois novos projetos ainda **não** foram criados: há quatro decisões (seção 7) que mudam a forma como eles nascem.

---

## 1. Conclusão em resumo

1. **A separação é viável e o backend já está mais perto de uma API do que parece.** Cerca de 90% das respostas dos controllers/rotas já são JSON (~430 `res.json` contra ~47 `res.render`). As telas mais pesadas já funcionam como "mini-SPAs": buscam dados via `fetch` e montam a tabela no navegador.
2. **"Manter a codificação atual do backend" é possível com uma ressalva inevitável:** as ~20 rotas que hoje devolvem HTML (`res.render`) e os ~46 `res.redirect` precisam passar a devolver JSON. Stack (Node/Express/MySQL), services, models, SQL, geração de PDF e e-mail ficam como estão.
3. **O problema de interface não é a falta de Angular, é a forma como o frontend foi escrito:** 62% das linhas das views são JavaScript inline (≈8.650 de ≈14.000), sem componentes reutilizáveis, com tabelas, paginação e modais reescritos à mão em cada tela. Angular + uma biblioteca de componentes resolve isso; a suposição é razoável. O ganho vem da biblioteca de componentes e da componentização, e o custo é reescrever ≈12.000 linhas de frontend.
4. **Há problemas de segurança no legado que não devem ser copiados para o novo backend** (seção 4), dois deles graves: leitura de arquivos arbitrários do servidor por usuário autenticado e PDFs assinados acessíveis sem login.
5. **Recomendação:** migração incremental, tela a tela, com legado e novo sistema rodando lado a lado sobre o mesmo banco, atrás do mesmo proxy.

---

## 2. Retrato do legado

### 2.1 Stack e tamanho

| Item | Situação |
|---|---|
| Backend | Node.js + Express 4, `mysql2`, sessão em MySQL (`express-session` + `express-mysql-session`) |
| Frontend | EJS + `express-ejs-layouts`, Bootstrap via CDN, JS inline |
| PDF | Puppeteer, HTML montado como string dentro dos controllers |
| E-mail | Nodemailer, configuração lida da tabela de parâmetros |
| Deploy | PM2, 1 instância em modo `fork`, em `/opt/nodejs/apps/gestao-bcc` |
| Testes / lint / CI | Inexistentes (`npm test` devolve erro, `lint` é um `echo`) |

| Camada | Arquivos | Linhas (aprox.) |
|---|---|---|
| Controllers (`src/controllers`) | 7 | 6.600 |
| Rotas (`src/routes` + `routes/`) | 9 | 3.900 |
| Services (`src/services`) | 6 | 2.000 |
| Models (`src/models`) | 4 | 1.160 |
| Views EJS (`views/`) | 21 | 14.000 |
| JS de navegador (`public/js`) | 5 | 3.500 |

Tabelas usadas: `pessoa`, `pessoa_login`, `pessoa_modulos`, `modulos`, `campo_estagio`, `campo_estagio_planoatividade`, `campo_estagio_frequencia`, `frequencia_registrodiario`, `parametro`, `parametrovalor`, `auditoria`, `sessions`.

### 2.2 Por que hoje tudo reinicia junto

- `app.js` monta, no mesmo processo, API, arquivos estáticos (`public/`), motor de views (EJS) e sessão.
- Em produção o Express mantém as views compiladas em cache: alterar um `.ejs` exige reiniciar o processo.
- Há uma única instância PM2 em modo `fork`, então qualquer reinício derruba o sistema inteiro por alguns segundos.

### 2.3 Estrutura duplicada

Existem duas gerações de código convivendo:

| Raiz (antiga) | `src/` (atual) | Situação |
|---|---|---|
| `controllers/FrequenciaController.js` (547 linhas) | `src/controllers/FrequenciaController.js` (1.599) | O da raiz só é usado por rota morta |
| `routes/frequencias.js` | `src/routes/frequencias.js` | O da raiz importa `../middleware/auth`, **que não existe**; nunca é montado |
| `routes/secure-routes.js` (1.723 linhas) | — | **Em uso**, montado em `/secure` |
| `middleware/access-control.js`, `helpers/database-helper.js` | `src/middleware/*` | Em uso apenas por `secure-routes.js` |

Na raiz há ainda 11 scripts avulsos de depuração/migração (`check_*.js`, `debug_*.js`, `fix-producao-emergencial.js`, `migrate_*.js`, etc.), um deles vazio (`debug_email_vazio.js`).

### 2.4 Rotas

≈180 rotas declaradas. Pontos relevantes para a migração:

- **Lógica e SQL dentro de arquivos de rota:** `routes/secure-routes.js` tem ~40 comandos SQL e `src/routes/index.js` (1.386 linhas) tem ~22. Controllers também têm SQL direto (`FrequenciaController` 21, `PlanoAtividadeController` 20, `PessoaController` 14).
- **Rotas duplicadas para o mesmo recurso:**
  - parâmetros em `/parametro`, `/admin/parametro` e `/secure/parametros`;
  - estágios em `/estagios` e `/secure/estagios` (o mesmo router montado duas vezes);
  - busca de pessoas em `/api/pessoas/buscar`, `/secure/pessoas/buscar` e `/pessoas/buscar`;
  - `dashboard-administrativo/planos/:campoId` em dois arquivos.
- **Rota inalcançável:** `GET /pessoas/buscar` (`src/routes/pessoas.js:86`) é declarada depois de `GET /pessoas/:id` (linha 33) e nunca é atingida.
- **13 views referenciadas que não existem** (`estagios/index|show|create|edit`, `pessoas/index|show|create`, `frequencia-list`, `planos-atividade-list`, `register`, `relatorio-completo`, `reports/index`, `settings/index`): as rotas correspondentes quebram com erro 500 se chamadas.
- **Chamadas do frontend a endpoints que não existem no backend**, quase todas em `admin-rotinas.ejs`: `/admin/usuario-modulos`, `/admin/desvincular-modulos`, `/admin/desvincular-todos-modulos/:id`, `/admin/estagiario/:id/status`, `/admin/alterar-senha`, `/admin/usuarios/:id`, `/health-check`. São funcionalidades de tela que hoje falham.
- **Backup/restauração** (`/admin/criar-backup`, `listar-backups`, `restaurar-backup`, `download-backup`) são esqueletos: devolvem dados fictícios.
- **Três implementações diferentes de `requireAuth`** (`src/config/session.js`, `routes/secure-routes.js`, `src/routes/frequencias.js`) e a checagem de administrador repetida à mão ~15 vezes como `nivelacesso !== 'Administrador'`.

### 2.5 Frontend

| View | Linhas | JS inline | Tags EJS | Observação |
|---|---|---|---|---|
| `dashboard-estagio.ejs` | 2.782 | 2.275 | 37 | Tela principal do módulo |
| `admin-rotinas.ejs` | 2.607 | 1.835 | 8 | Usuários, módulos, backup |
| `dashboard-estagio-administrativo.ejs` | 1.521 | 1.026 | 0 | Já é 100% cliente + JSON |
| `admin-pessoas.ejs` | 1.331 | 860 | 3 | + `pessoa-manager.js` (1.363) |
| `campo-estagio-form.ejs` | 1.191 | 895 | 41 | |
| `admin-parametro.ejs` | 864 | 483 | 37 | |
| `frequencia-form.ejs` | 642 | 430 | 19 | |
| `plano-atividade-form.ejs` | 501 | 265 | 52 | |
| demais 13 views | 2.574 | 579 | — | login, senha, perfil, erro, testes |

- Bootstrap em **duas versões** (5.1.3 e 5.3.0) conforme a tela; jQuery em duas telas; Font Awesome; tudo por CDN.
- `layout.ejs` carrega 341 linhas de CSS inline; outras views repetem blocos `<style>` próprios.
- Não há componente de tabela: cada tela reimplementa listagem, paginação, filtro e modal.
- 109 `console.log` no código de navegador.

O número de tags EJS é o indicador de dificuldade: telas com poucas tags (dashboards, pessoas, rotinas) já consomem JSON e migram quase diretamente; telas de formulário (`plano-atividade-form`, `campo-estagio-form`, `admin-parametro`) recebem os dados injetados pelo servidor e precisam de um endpoint JSON novo.

---

## 3. O que muda no backend (e o que não muda)

**Permanece igual:** Express, `mysql2`, `BaseModel` e models, services, validadores, SQL, geração de PDF (o HTML dos PDFs é montado nos controllers, não depende de `views/`), e-mail, upload com `multer`, logging com `winston`, sessão em MySQL.

**Precisa mudar:**

| Mudança | Motivo |
|---|---|
| ~47 `res.render` → `res.json` com os mesmos dados | Não há mais views no backend |
| ~46 `res.redirect` → resposta JSON (`401`, `403`, `{ success, message }`) | Navegação passa a ser do Angular |
| Remover EJS, `express-ejs-layouts`, `method-override`, `express.static(public)` | Deixam de ter função |
| Prefixo único `/api` para todas as rotas | Permite ao proxy separar frontend e backend |
| Um único middleware de autenticação/autorização | Substitui as três versões atuais |
| Link de redefinição de senha no e-mail aponta para a URL do frontend | Hoje aponta para rota EJS |
| `src/routes/auth.js:41-66` (gambiarra que sobrescreve `res.render`) desaparece | Só existia para contornar o layout |

**Recomendado aproveitar a cópia para limpar (opcional, não altera regra de negócio):** unificar as rotas duplicadas, não levar o código morto da seção 2.3, não levar rotas de teste, mover o SQL de `secure-routes.js` e `routes/index.js` para services.

---

## 4. Segurança — não copiar para o novo backend

| # | Gravidade | Achado | Local |
|---|---|---|---|
| 1 | Alta | **Leitura de arquivo arbitrário.** `:filename` é concatenado ao caminho sem validação; `..%2F..%2F` sai do diretório. Reproduzi o mesmo trecho isoladamente e ele devolveu o `package.json` da raiz. Qualquer usuário logado pode ler, por exemplo, `dadosConexaoSGDB.js`. | `src/routes/index.js:103` e `:138` |
| 2 | Alta | **Uploads públicos.** Os PDFs de planos assinados são gravados em `public/uploads/planos-atividade`, e `public/` é servido como estático sem login. Quem tiver a URL baixa o documento. | `PlanoAtividadeController.js:17`, `app.js:206-211` |
| 3 | Alta | **Cookies de sessão gravados em log.** O `requireAuth` de `/secure` imprime todos os cabeçalhos e cookies a cada requisição. | `routes/secure-routes.js:58-66` |
| 4 | Média | Limite de tentativas de login **desativado** ("temporariamente para debug"). | `app.js:158-170` |
| 5 | Média | CSP do Helmet **desativado** ("temporariamente para debug"). | `app.js:127-129` |
| 6 | Média | Segredos com valor padrão fixo no código se a variável de ambiente faltar. | `src/config/session.js:46`, `src/config/index.js:155` |
| 7 | Média | Sem proteção CSRF além de `sameSite: lax`; `GET /logout` altera estado. | `app.js`, `src/routes/index.js:36` |
| 8 | Média | Rotas de teste expostas sem autenticação: `/auth/test-form`, `/auth/test-login`, `/auth/simple-login`, `/test-root`, `/secure/test`. | `src/routes/auth.js:73-110`, `app.js:278` |
| 9 | Baixa | `/parametro/buscar` e `/buscar-valor` ficam antes do `requireAuth`. Verificar se algum parâmetro sensível (ex.: senha de e-mail) pode ser lido sem login. | `src/routes/parametros.js:74-80` |
| 10 | Baixa | 208 `console.log` no servidor, vários com corpo de requisição. | geral |

Os itens 1, 2 e 3 valem correção no legado mesmo antes da migração, se for aceito abrir exceção à regra de não alterá-lo.

### Higiene do repositório

- `node_modules/` está versionado (7.287 arquivos) apesar de constar no `.gitignore`.
- `package-lock.json` está no `.gitignore` mas também versionado.
- `modelagem_bancodados.mwb.bak` versionado.
- `jsonwebtoken` instalado e com funções em `AuthService`, aparentemente sem uso (a autenticação é toda por sessão).

---

## 5. Arquitetura proposta

```
UFJ_BCC-Gestao/
├── (legado, intocado)
├── coordenai_backend/        API REST — Node/Express, mesma base de código
│   ├── src/
│   │   ├── config/  controllers/  services/  models/
│   │   ├── middleware/   (auth único, erros, logging)
│   │   ├── routes/       (um arquivo por recurso, tudo sob /api)
│   │   └── validators/  utils/
│   ├── storage/uploads/  (fora de qualquer pasta pública)
│   ├── scripts/          (migrações e utilitários hoje soltos na raiz)
│   ├── tests/
│   ├── server.js  package.json  .env.example  ecosystem.config.example.js
└── coordenai_frontend/       Angular
    └── src/app/
        ├── core/      (auth, interceptors, guards, serviços de API)
        ├── shared/    (tabela, diálogo de confirmação, busca de pessoa, pipes)
        ├── layout/    (menu, cabeçalho)
        └── features/
            ├── auth/           login, recuperar/redefinir/alterar senha
            ├── modulos/        página inicial de módulos
            ├── estagio/        dashboard, dashboard administrativo, campo de estágio
            ├── planos-atividade/
            ├── frequencias/    formulário e lançamento diário
            ├── pessoas/        listagem, formulário, importação CSV, perfil
            └── admin/          parâmetros, rotinas (usuários, módulos)
```

### Publicação independente

```
                    Apache / Nginx
        ┌────────────────┴────────────────┐
   /  → arquivos estáticos           /api → 127.0.0.1:3001
   coordenai_frontend/dist           coordenai_backend (PM2)
```

- **Atualizar frontend:** `ng build` e trocar a pasta `dist`. Nenhum processo reinicia.
- **Atualizar backend:** `pm2 reload coordenai-backend`. O frontend continua no ar.
- Mesma origem para o navegador: **não há CORS** e o cookie de sessão atual continua funcionando.

### Autenticação

Recomendo **manter sessão por cookie** (como hoje), acrescentando token CSRF. Trocar para JWT não traz ganho neste cenário de mesma origem, obriga a reescrever os 136 usos de `req.session.user` e contraria "manter a codificação do backend". No Angular: `withCredentials`, um interceptor que trata `401` redirecionando ao login e guards por nível de acesso (a autorização real continua no backend).

### Biblioteca de componentes

| Opção | A favor | Contra |
|---|---|---|
| **PrimeNG** (recomendada) | Tabela completa pronta (filtro por coluna, ordenação, paginação no servidor, exportação, seleção), ~90 componentes, temas com aparência comercial | API extensa; atualizações de versão exigem atenção |
| Angular Material | Mantida pelo time do Angular, muito estável | Tabela básica: filtros e exportação teriam de ser escritos |
| Angular Material + AG Grid | Melhor grade de dados do mercado | Recursos avançados do AG Grid são pagos |

Como a dor relatada são tabelas, botões e formatação, PrimeNG cobre mais com menos código próprio.

---

## 6. Plano de migração (incremental)

O proxy permite que legado e novo sistema convivam: cada tela migrada passa a ser servida pelo Angular, as demais seguem no legado. Os dois backends usam o mesmo banco.

| Fase | Entrega | Tamanho |
|---|---|---|
| 0 | Decisões da seção 7; registrar as respostas JSON atuais das rotas principais como referência de regressão | P |
| 1 | `coordenai_backend`: cópia de `src/` + partes vivas de `routes/`, `middleware/`, `helpers/`; prefixo `/api`; auth único; sem EJS; correções da seção 4; testes de fumaça das rotas | M |
| 2 | `coordenai_frontend`: projeto Angular, tema, layout, login/logout, recuperação de senha, guards, interceptors, página de módulos, componente de tabela compartilhado | M |
| 3 | Dashboard administrativo de estágio (0 tags EJS: a API já existe) — serve de piloto para validar a biblioteca de UI com usuários | M |
| 4 | Pessoas (listagem, formulário, importação CSV, perfil) | M |
| 5 | Dashboard de estágio + campo de estágio + planos de atividade (inclui upload e PDF) | G |
| 6 | Frequências (formulário, lançamento diário, aprovações, PDF) | M |
| 7 | Administração: parâmetros e rotinas; decidir o destino dos endpoints inexistentes e do backup fictício | M |
| 8 | Virada: todo o tráfego no novo sistema; legado fica somente como referência | P |

Riscos principais:

- **Sem testes automatizados**, a paridade de comportamento depende de comparação manual. A fase 0 reduz isso.
- **Regras de negócio escondidas no JS inline** (validações, cálculos de carga horária, filtros por nível de acesso feitos na tela) precisam ser lidas tela a tela; não basta redesenhar.
- **Sessão compartilhada** durante a convivência: definir se os dois backends usam o mesmo cookie/segredo (login único) ou cookies distintos.
- **Puppeteer** continua no backend e continua sendo o item mais pesado de memória; o limite de 500 MB do PM2 deve ser revisto.

---

## 7. Decisões necessárias antes de criar os projetos

1. **Biblioteca de UI:** PrimeNG (recomendada), Angular Material ou Material + AG Grid.
2. **Autenticação:** manter sessão por cookie + CSRF (recomendado) ou migrar para JWT.
3. **Estratégia:** incremental com convivência (recomendado) ou reescrita completa com virada única.
4. **Escopo da limpeza no backend:** apenas o mínimo para virar API, ou também unificar rotas duplicadas e mover SQL das rotas para services (recomendado, pois o custo é baixo no momento da cópia).

Pergunta adicional: os itens 1 a 3 da seção 4 podem ser corrigidos no legado, como exceção à regra de não alterá-lo?
