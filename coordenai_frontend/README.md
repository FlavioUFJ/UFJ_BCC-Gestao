# coordenai_frontend

Interface do CoordenAI em Angular 22 + Angular Material. Consome a API do
projeto [`coordenai_backend`](../coordenai_backend).

## Executar

```bash
npm install
npm start          # http://localhost:4200, com /api encaminhado para localhost:3001
npm test           # testes unitários
npm run build      # produção, servido na raiz do site
npm run build:convivencia   # produção, servido em /app/ ao lado do legado
```

O resultado do build fica em `dist/coordenai_frontend/browser`: são arquivos
estáticos. Publicar o frontend é copiar essa pasta; nenhum processo reinicia.

## Estrutura

```
src/app/core/       sessão do usuário, interceptador da API, guards, convivência com o legado
src/app/shared/     componentes reutilizáveis (tabela, confirmação, campo de senha)
src/app/layout/     estrutura das telas (com e sem login)
src/app/features/   telas, por área (auth, modulos, admin)
src/styles.scss     tema (cores da marca) e padrões de página
src/environments/   endereço da API e do legado
```

## Padrões para novas telas

- **Tabelas:** usar `<app-tabela-dados>` (`shared/tabela-dados`). Informa-se
  dados e colunas; pesquisa, ordenação, paginação e os estados de
  carregamento, erro e lista vazia já vêm prontos. Exemplo:
  `features/admin/modulos-sistema.ts`.
- **Confirmações:** `ConfirmacaoService.perguntar(...)`.
- **Mensagens:** `NotificacaoService` para retorno rápido; `.aviso` para erros
  que ficam na página.
- **Erros da API:** `mensagemDeErro(erro, 'mensagem padrão')`.
- **Autorização:** guards em `core/guards.ts` cuidam da navegação; quem decide
  de fato é sempre a API.

## Telas ainda no legado

`core/legado.ts` guarda a lista de telas já migradas. Links para as demais
(módulos, itens do menu) abrem o legado, que compartilha a sessão. Ao migrar
uma tela, registre nesse arquivo o caminho antigo e a nova rota.
