# Plano de migração do CoordenAI

Acompanha a [auditoria](AUDITORIA-REFATORACAO-COORDENAI.md). Registra o que
foi decidido, o que já está feito e o que falta.

## Bloqueio: o repositório não corresponde ao sistema em homologação

Ao carregar o backup do banco de homologação (`dev_coordenai`, 09/11/2026)
para iniciar a fase 3, constatei que o código deste repositório não é o
código que roda sobre esse banco:

| | Repositório (`dev`, último commit em 21/08/2025) | Banco de homologação |
|---|---|---|
| Tabelas | 12 usadas pelo código | 166 |
| Módulos | Estágio | Eventos, Estágio, TCC, Formulários, Administrativo (ativos); Extensão e Coordenação (inativos) |
| Tabelas de estágio | `campo_estagio`, `campo_estagio_planoatividade`, `campo_estagio_frequencia`, `frequencia_registrodiario` | `estagio_campoatuacao`, `estagio_planoatividade`, `estagio_frequencia`, `estagio_frequenciadiaria` e outras seis |
| Níveis de acesso | Administrador e os papéis de estágio | `Administrador`, `Operador`, `Visitante`, mais permissão por módulo |

Das consultas SQL do repositório, 135 apontam para as quatro tabelas de
estágio que não existem mais. Rodando o `coordenai_backend` contra o backup:

- funcionam: login (administrador), sessão, página de módulos (7 módulos),
  busca de pessoas, consulta de parâmetros;
- falham: todas as rotas de estágio, planos de atividade e frequências
  (`Table 'campo_estagio' doesn't exist` e equivalentes).

Consequências:

1. **A fase 3 não pode ser feita a partir deste repositório.** Migrar o
   dashboard administrativo com base em código de 15 meses atrás reproduziria
   regras e consultas que o sistema já abandonou.
2. **A auditoria descreve o código do repositório, não o sistema atual.** Os
   números de tamanho estão subestimados (o sistema tem pelo menos cinco
   módulos ativos) e os achados de segurança precisam ser reconferidos no
   código atual. O banco tem, por exemplo, `pessoa_login_tentativa` e
   `pessoa_senha_recuperacao`, o que indica que limite de tentativas e token de
   recuperação em banco já podem existir lá.
3. **O `coordenai_backend` foi copiado de uma versão antiga.** A estrutura
   (API sob `/api`, autenticação única, CSRF, adaptador, uploads) continua
   válida, mas controllers, services e rotas precisam ser refeitos a partir do
   código atual.
4. **O `coordenai_frontend` não é afetado**: a base, o tema, as telas de
   autenticação e os componentes compartilhados não dependem do esquema.
   Falta confirmar no código atual as regras de exibição dos módulos (campos
   `ativo` e `permissao`).

Para prosseguir é preciso o código-fonte atual. Existe um repositório privado
`bcc-ufj/coordenai`, atualizado em 09/11/2026, que provavelmente é a fonte;
esta sessão não tem acesso a ele.

## Decisões

| Tema | Decisão |
|---|---|
| Estratégia | Incremental: legado e novo sistema convivem, tela a tela |
| Autenticação | Sessão por cookie (a mesma do legado) + token CSRF |
| Biblioteca de UI | **Angular Material** (ver nota abaixo) |
| Limpeza do backend | Código morto, rotas de teste e duplicidade de autenticação removidos na cópia. Unificação de rotas duplicadas e saída do SQL dos arquivos de rota: junto com a migração de cada tela |
| Legado | Recebeu somente as três correções de segurança combinadas |

**Sobre a biblioteca de UI.** A recomendação inicial era PrimeNG. Ao instalar,
verifiquei que a partir da versão 22 (julho/2026) ela deixou de ser MIT: exige
chave de licença, é gratuita apenas para organizações pequenas ou mediante
enquadramento renovado anualmente, e exibe um aviso na tela sem a chave. As
versões até a 21 continuam MIT, mas só funcionam com Angular 21 e não
receberão as novidades. Para não amarrar o sistema a uma licença que a
universidade ainda não avaliou, o frontend foi iniciado com Angular Material
(MIT, mantido pela equipe do Angular). As telas não usam a biblioteca
diretamente para tabelas: usam o componente `app-tabela-dados`, de modo que
trocar a implementação depois afeta um arquivo, não todas as telas.

## Arquitetura

```
                       Apache
   ┌──────────────────────┼───────────────────────┐
/app/  → arquivos estáticos        /api/ → 127.0.0.1:3001       demais caminhos → 127.0.0.1:3000
coordenai_frontend/dist            coordenai_backend (PM2)      legado (PM2), até o fim da migração
```

Exemplo de configuração (Apache, dentro do `VirtualHost` HTTPS):

```apache
# API nova
ProxyPass        /api/ http://127.0.0.1:3001/api/
ProxyPassReverse /api/ http://127.0.0.1:3001/api/

# Frontend novo (arquivos estáticos)
ProxyPass /app/ !
Alias /app /opt/nodejs/apps/coordenai_frontend/browser
<Directory /opt/nodejs/apps/coordenai_frontend/browser>
    Require all granted
    FallbackResource /app/index.html
</Directory>

# Legado (tudo o que não for /api nem /app)
ProxyPass        / http://127.0.0.1:3000/
ProxyPassReverse / http://127.0.0.1:3000/
```

Este trecho não foi testado em um Apache; a mesma topologia foi validada com
um proxy de teste em Node (ver "Verificação").

Rotinas de publicação:

| O que mudou | Comando | Efeito no restante |
|---|---|---|
| Frontend | `npm run build:convivencia` e copiar `dist/coordenai_frontend/browser` | Nenhum processo reinicia |
| Backend | `pm2 reload coordenai-backend` | Frontend e legado seguem no ar |

Para a convivência funcionar: mesmo `SESSION_SECRET` no legado e no novo
backend, `UPLOADS_DIR` do novo backend apontando para `public/uploads` do
legado e `FRONTEND_URL` com o endereço público do frontend (incluindo `/app`).
No frontend, `environment.legadoUrl` vazio (mesma origem).

Quando a migração terminar, o frontend passa a ser servido na raiz
(`npm run build`) e o bloco do legado sai do proxy.

## Situação das fases

| Fase | Entrega | Situação |
|---|---|---|
| 0 | Decisões | Feito |
| 0 | Registro das respostas atuais das rotas como referência de regressão | **Pendente** — exige uma cópia do banco real |
| 1 | `coordenai_backend` | Feito |
| 2 | `coordenai_frontend`: base, tema, login, senhas, módulos, tabela padrão | Feito |
| 3 | Dashboard administrativo de estágio (piloto com usuários) | **Bloqueada** — ver acima |
| 4 | Pessoas (listagem, formulário, importação CSV, perfil) | A fazer |
| 5 | Dashboard de estágio, campo de estágio, planos de atividade | A fazer |
| 6 | Frequências | A fazer |
| 7 | Administração: parâmetros e rotinas | A fazer |
| 8 | Virada e desligamento do legado | A fazer |

### Fase 1 — o que foi feito no backend

- Copiado o código em uso: `src/`, `routes/secure-routes.js` (agora
  `src/routes/secure.js`), `middleware/access-control.js`,
  `helpers/database-helper.js`, scripts de banco.
- Não copiado: `controllers/FrequenciaController.js` e `routes/frequencias.js`
  da raiz (código morto), scripts avulsos de depuração da raiz, views e
  `public/`.
- Todas as rotas sob `/api`, respondendo JSON (adaptador descrito no README
  do backend).
- Autenticação e autorização em um único arquivo (`src/middleware/auth.js`).
- Credenciais do banco por variáveis de ambiente (`DB_*`), sem arquivo de
  senha fora do Git.
- Removidas: rotas de teste, rotas que renderizavam views inexistentes,
  rotas que só serviam páginas, `/files` e `/reports` (travessia de diretório),
  autocadastro (`/auth/register`).
- Segurança: CSP ligado, limite de tentativas de login religado (por IP +
  e-mail), token CSRF, segredo de sessão obrigatório em produção, uploads fora
  de pasta pública, consulta de parâmetros exige login e esconde as
  credenciais de e-mail de quem não é administrador, logs de cookies e
  cabeçalhos removidos.

### Fase 2 — o que foi feito no frontend

- Angular 22, componentes autônomos, sem zone.js, rotas carregadas sob demanda.
- Tema com as cores do logotipo; fonte e ícones servidos pelo próprio projeto
  (sem CDN).
- Telas: entrar, recuperar senha, redefinir senha, alterar senha, módulos
  (página inicial) e consulta de módulos do sistema (administrador).
- Componentes compartilhados: tabela padrão, diálogo de confirmação, campo de
  senha.
- Links para telas ainda não migradas abrem o legado (`core/legado.ts`).

## Verificação

Feita em ambiente local com MariaDB e um **banco mínimo de teste** (tabelas
de pessoa, login e módulos deduzidas do código), não com o banco real.

| Verificação | Resultado |
|---|---|
| Testes do backend (`npm test`) | 21 de 21 |
| Testes do frontend (`npm test`) | 9 de 9 |
| Roteiro no navegador: login, erro de senha, módulos, tabela (pesquisa, ordenação), alterar senha, sair, proteção de rotas, usuário não administrador, celular | 21 verificações aprovadas |
| Build de produção sob `/app/` atrás de proxy: link direto, login, recarregar | Aprovado |
| Login feito no legado vale no novo backend e vice-versa | Aprovado |
| Correções no legado: travessia em `/files` e `/reports`, uploads públicos, log de cookies | Aprovado |

Não verificado:

- Rotas de negócio (estágios, planos, frequências, pessoas, parâmetros) contra
  dados reais. Elas sobem e exigem login, mas o comportamento com o banco de
  produção ainda não foi conferido.
- Envio de e-mail e, por consequência, o fluxo completo de redefinição de
  senha (o link inválido/expirado foi testado).
- Geração de PDF e upload de plano assinado no novo backend.
- Configuração do Apache.

## Atenção antes de publicar

1. Os arquivos `src/config/database.js` e `src/config/puppeteer.js` do novo
   backend partiram dos **exemplos** do repositório. Os de produção ficam fora
   do Git: se tiverem ajustes locais (pool, caminho do Chromium), é preciso
   trazê-los.
2. Os tokens de redefinição de senha ficam em memória, como no legado: o link
   precisa ser aberto no mesmo sistema que o gerou e se perde ao reiniciar.
   Enquanto houver convivência, mantenha a recuperação de senha em um só
   sistema; o ideal é gravar o token no banco (as colunas de
   `add_reset_token_columns.js` parecem existir para isso).
3. A permissão `requirePermissions([Administrador, Orientador])` das rotas de
   estágios compara com os **módulos** do usuário, não com o nível de acesso.
   Na prática só administradores passam. Mantive o comportamento do legado;
   vale confirmar qual era a intenção.
4. O nome do PDF de plano assinado é derivado apenas do nome do estagiário
   (`<nome>_PlanoAtividade_assinado.pdf`): dois planos da mesma pessoa, ou
   homônimos, sobrescrevem o arquivo um do outro. Mantido como está para não
   quebrar os arquivos existentes; corrigir na fase 5.
