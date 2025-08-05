# Documentação das Rotas - Sistema de Gestão de Estágios

## Estrutura Geral

O sistema utiliza uma arquitetura modular de rotas, organizadas por funcionalidade e com middlewares de autenticação apropriados.

## Arquivo Principal (`src/routes/index.js`)

### Rotas Principais
- `GET /` - Dashboard (requer autenticação)
- `GET /logout` - Logout
- `POST /logout` - Logout
- `GET /session-status` - Verificar status da sessão

### Rotas de Arquivos Estáticos
- `GET /files/:type/:filename` - Arquivos protegidos (uploads, reports)
- `GET /reports` - Listagem de relatórios
- `GET /reports/:filename` - Relatório específico

### Rotas de Configurações
- `GET /settings` - Configurações do sistema (apenas admin)

### Rotas de API
- `GET /api/search` - Busca geral no sistema

## Rotas Modulares

### Autenticação (`/auth`)
**Arquivo:** `src/routes/auth.js`
**Middleware:** `requireGuest` (apenas usuários não autenticados)

#### Login
- `GET /auth/login` - Formulário de login
- `POST /auth/login` - Processar login

#### Registro
- `GET /auth/register` - Formulário de registro
- `POST /auth/register` - Processar registro

#### Recuperação de Senha
- `GET /auth/forgot-password` - Formulário de recuperação
- `POST /auth/forgot-password` - Processar solicitação
- `GET /auth/reset-password/:token` - Formulário de redefinição
- `POST /auth/reset-password/:token` - Processar redefinição

### Estágios (`/estagios`)
**Arquivo:** `src/routes/estagios.js`
**Middleware:** `requireAuth` (todas as rotas)

#### Interface (Views)
- `GET /estagios` - Listar estágios
- `GET /estagios/create` - Formulário de criação (admin/orientador)
- `GET /estagios/:id` - Detalhes do estágio
- `GET /estagios/:id/edit` - Formulário de edição

#### Ações (CRUD)
- `POST /estagios` - Criar estágio (admin/orientador)
- `PUT /estagios/:id` - Atualizar estágio
- `PATCH /estagios/:id` - Atualizar estágio (alternativo)
- `PATCH /estagios/:id/status` - Alterar status (admin/orientador)
- `DELETE /estagios/:id` - Excluir estágio (apenas admin)

#### API
- `GET /estagios/api/user/:userId/:userType` - Buscar por usuário

### Pessoas (`/pessoas`)
**Arquivo:** `src/routes/pessoas.js`
**Middleware:** `requireAuth` (todas as rotas)

#### Interface (Views)
- `GET /pessoas` - Listar pessoas (apenas admin)
- `GET /pessoas/create` - Formulário de criação (apenas admin)
- `GET /pessoas/profile` - Perfil do usuário logado
- `GET /pessoas/:id` - Detalhes da pessoa
- `GET /pessoas/:id/edit` - Formulário de edição

#### Ações (CRUD)
- `POST /pessoas` - Criar pessoa (apenas admin)
- `PUT /pessoas/profile` - Atualizar perfil próprio
- `PUT /pessoas/:id` - Atualizar pessoa
- `PATCH /pessoas/:id` - Atualizar pessoa (alternativo)

#### Autenticação e Segurança
- `POST /pessoas/change-password` - Alterar senha própria

#### Administrativas
- `PATCH /pessoas/:id/status` - Alterar status (apenas admin)
- `POST /pessoas/:id/login` - Gerenciar login (apenas admin)
- `DELETE /pessoas/:id` - Excluir pessoa (apenas admin)

#### API
- `GET /pessoas/api/:tipo` - Buscar por tipo

### Parâmetros (`/parametros`)
**Arquivo:** `src/routes/parametros.js`
**Middleware:** `requireAuth` (todas as rotas)

#### Interface (Views)
- `GET /parametros` - Listar parâmetros
- `GET /parametros/create` - Formulário de criação (apenas admin)
- `GET /parametros/:id` - Detalhes do parâmetro
- `GET /parametros/:id/edit` - Formulário de edição (apenas admin)

#### Ações (CRUD)
- `POST /parametros` - Criar parâmetro (apenas admin)
- `PUT /parametros/:id` - Atualizar parâmetro (apenas admin)
- `PATCH /parametros/:id` - Atualizar parâmetro alternativo (apenas admin)
- `DELETE /parametros/:id` - Excluir parâmetro (apenas admin)

#### Valores de Parâmetros
- `POST /parametros/:parametroId/valores` - Criar valor (apenas admin)
- `PUT /parametros/:parametroId/valores/:valorId` - Atualizar valor (apenas admin)
- `DELETE /parametros/:parametroId/valores/:valorId` - Excluir valor (apenas admin)

#### API
- `GET /parametros/api/buscar` - Buscar parâmetros (usado pelo frontend)

## Middlewares de Segurança

### `requireAuth`
- Verifica se o usuário está autenticado
- Redireciona para login se não autenticado
- Aplicado a todas as rotas protegidas

### `requireGuest`
- Permite acesso apenas a usuários não autenticados
- Redireciona usuários logados para o dashboard
- Usado nas rotas de autenticação

### `requireAdmin`
- Verifica se o usuário é administrador
- Usado em operações administrativas

### `requirePermissions`
- Verifica permissões específicas do usuário
- Usado para controle granular de acesso

## Validações

### `validateParametro`
- Valida dados de parâmetros
- Aplicado nas rotas de criação/atualização

### `validateValor`
- Valida dados de valores de parâmetros
- Aplicado nas rotas de valores

## Tratamento de Erros

- Middleware de captura de rotas não encontradas (404)
- Middleware de tratamento de erros gerais
- Retorno consistente em formato JSON para APIs
- Renderização de páginas de erro para interfaces

## Observações

1. **Consistência**: Todas as rotas seguem padrões REST
2. **Segurança**: Middlewares apropriados para cada nível de acesso
3. **Organização**: Separação clara entre views, ações e APIs
4. **Flexibilidade**: Suporte a múltiplos métodos HTTP (PUT/PATCH)
5. **Compatibilidade**: Mantém compatibilidade com frontend existente