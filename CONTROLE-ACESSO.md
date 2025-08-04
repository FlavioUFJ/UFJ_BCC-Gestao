# Sistema de Controle de Acesso por Pessoa

## Visão Geral

Este sistema implementa um controle de acesso automático baseado no `id_pessoa` do usuário logado e seu `nivelacesso`. O sistema identifica automaticamente todas as tabelas que referenciam a tabela `Pessoa` e aplica filtros apropriados para garantir que usuários não-administradores vejam apenas dados relacionados a eles.

## Arquitetura do Sistema

### Componentes Principais

1. **AccessControl Middleware** (`middleware/access-control.js`)
   - Núcleo do sistema de controle de acesso
   - Aplica filtros automáticos em queries SQL
   - Valida permissões para operações CRUD

2. **DatabaseHelper** (`helpers/database-helper.js`)
   - Interface simplificada para operações de banco
   - Integra automaticamente o controle de acesso
   - Métodos para SELECT, INSERT, UPDATE, DELETE

3. **Secure Routes** (`routes/secure-routes.js`)
   - Exemplos de rotas com controle de acesso
   - Demonstra uso prático do sistema

## Mapeamento de Relações

### Tabelas que Referenciam `Pessoa`

| Tabela | Colunas FK para Pessoa |
|--------|------------------------|
| `campo_estagio` | `id_pessoa_curso`, `id_pessoa_estagiario`, `id_pessoa_orientador`, `id_pessoa_concedente`, `id_pessoa_supervisor` |
| `pessoa_login` | `id_pessoa` |
| `usuario_modulos` | `id_pessoa` |
| `planos_atividade` | Indireta via `campo_estagio_id` |
| `relatorios_estagio` | Indireta via `campo_estagio_id` |

### Relações Indiretas

Algumas tabelas se relacionam com `Pessoa` indiretamente através de `campo_estagio`:
- `planos_atividade` → `campo_estagio` → `pessoa`
- `relatorios_estagio` → `campo_estagio` → `pessoa`

## Regras de Acesso

### Administradores
- **Nível de Acesso**: `"Administrador"`
- **Permissões**: Acesso total a todos os dados
- **Filtros**: Nenhum filtro aplicado

### Usuários Regulares
- **Níveis de Acesso**: `"Operacional"`, `"Visitante"`, etc.
- **Permissões**: Apenas dados vinculados ao seu `id_pessoa`
- **Filtros**: Automáticos baseados em FK para `Pessoa`

## Como Usar

### 1. Uso Básico com DatabaseHelper

```javascript
const DatabaseHelper = require('./helpers/database-helper');

// Em uma rota
app.get('/meus-estagios', async (req, res) => {
    const dbHelper = new DatabaseHelper();
    const user = {
        id_pessoa: req.session.user.id_pessoa,
        nivelacesso: req.session.user.nivelacesso
    };
    
    try {
        // Query será automaticamente filtrada
        const estagios = await dbHelper.select(
            'SELECT * FROM campo_estagio ORDER BY id_campo_estagio',
            [],
            user,
            'campo_estagio'
        );
        
        res.json(estagios);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        dbHelper.close();
    }
});
```

### 2. Operações CRUD com Validação

```javascript
// Inserção com validação automática
app.post('/campo-estagio', async (req, res) => {
    const dbHelper = new DatabaseHelper();
    const user = req.session.user;
    
    try {
        const result = await dbHelper.insert(
            'campo_estagio',
            req.body,
            user
        );
        
        res.json({ success: true, id: result.lastID });
    } catch (error) {
        res.status(403).json({ error: error.message });
    } finally {
        dbHelper.close();
    }
});

// Atualização com validação
app.put('/campo-estagio/:id', async (req, res) => {
    const dbHelper = new DatabaseHelper();
    const user = req.session.user;
    
    try {
        const result = await dbHelper.update(
            'campo_estagio',
            req.body,
            { id_campo_estagio: req.params.id },
            user
        );
        
        res.json({ success: true, changes: result.changes });
    } catch (error) {
        res.status(403).json({ error: error.message });
    } finally {
        dbHelper.close();
    }
});
```

### 3. Queries Complexas com JOINs

```javascript
app.get('/relatorio-completo', async (req, res) => {
    const dbHelper = new DatabaseHelper();
    const user = req.session.user;
    
    try {
        // Obter condições de acesso para JOINs
        const accessConditions = await dbHelper.getJoinAccessConditions(user, 'ce');
        
        const query = `
            SELECT 
                ce.id_campo_estagio,
                pe.nome as estagiario,
                po.nome as orientador,
                ce.tipo_estagio,
                ce.situacao
            FROM campo_estagio ce
            LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
            LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
            WHERE ${accessConditions}
            ORDER BY pe.nome
        `;
        
        const results = await dbHelper.executeCustom(query, [], user);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        dbHelper.close();
    }
});
```

### 4. Verificação de Permissões

```javascript
// Verificar se usuário é admin
const isAdmin = await dbHelper.isAdmin(user);

// Verificar se pode modificar registro específico
const canModify = await accessControl.canModifyRecord(
    'campo_estagio',
    recordData,
    user.id_pessoa
);
```

## Integração com Rotas Existentes

### Método 1: Substituição Gradual

```javascript
// Antes
app.get('/rotinas', (req, res) => {
    db.all('SELECT * FROM campo_estagio', (err, rows) => {
        // ...
    });
});

// Depois
app.get('/rotinas', async (req, res) => {
    const dbHelper = new DatabaseHelper();
    const user = req.session.user;
    
    try {
        const rows = await dbHelper.select(
            'SELECT * FROM campo_estagio',
            [],
            user,
            'campo_estagio'
        );
        // ...
    } finally {
        dbHelper.close();
    }
});
```

### Método 2: Middleware de Rota

```javascript
const { getUserFromSession, requireAuth } = require('./routes/secure-routes');

// Aplicar middleware em rotas específicas
app.use('/admin/rotinas', getUserFromSession, requireAuth);
app.use('/admin/pessoas', getUserFromSession, requireAuth);
```

## Logs e Auditoria

O sistema registra automaticamente:
- Tentativas de acesso negado
- Queries executadas com filtros
- Operações CRUD realizadas
- Erros de permissão

```javascript
// Logs são salvos automaticamente
// Exemplo de saída:
// [2025-01-27 10:30:15] ACCESS_DENIED: User 3 tried to access record with id_pessoa 5
// [2025-01-27 10:30:20] QUERY_FILTERED: Applied filter for user 3 on table campo_estagio
```

## Extensibilidade

### Adicionando Nova Tabela

1. **Identifique as FKs para Pessoa**:
```javascript
// Em access-control.js, adicione na função getPersonRelatedColumns
case 'nova_tabela':
    return ['id_pessoa_responsavel', 'id_pessoa_criador'];
```

2. **Teste a Integração**:
```javascript
const results = await dbHelper.select(
    'SELECT * FROM nova_tabela',
    [],
    user,
    'nova_tabela'
);
```

### Customizando Regras de Acesso

```javascript
// Em access-control.js, modifique isAdmin para novos níveis
isAdmin(user) {
    return user.nivelacesso === 'Administrador' || 
           user.nivelacesso === 'SuperAdmin' ||
           user.categoria === 'Coordenador';
}
```

## Testes

Execute o script de teste para verificar o funcionamento:

```bash
node test-access-control.js
```

O script testa:
- Verificação de níveis de acesso
- Aplicação de filtros automáticos
- Comparação de queries filtradas vs originais
- Condições para JOINs complexos
- Simulação de operações CRUD
- Mapeamento de relações

## Rotas de Exemplo

Acesse as rotas de demonstração:
- `/secure/rotinas-seguras` - Lista filtrada de estágios
- `/secure/pessoa/:id` - Dados de pessoa com controle
- `/secure/relatorio-completo` - Relatório com JOINs complexos

## Benefícios

✅ **Segurança Automática**: Filtros aplicados automaticamente
✅ **Facilidade de Uso**: Interface simples e intuitiva
✅ **Flexibilidade**: Suporte a queries complexas
✅ **Auditoria**: Logs automáticos de acesso
✅ **Extensibilidade**: Fácil adição de novas tabelas
✅ **Performance**: Filtros aplicados no nível SQL
✅ **Manutenibilidade**: Código centralizado e reutilizável

## Considerações de Performance

- Filtros são aplicados no nível SQL (não em memória)
- Índices recomendados nas colunas FK para `Pessoa`
- Cache de verificações de admin para sessões ativas
- Logs assíncronos para não impactar performance

## Segurança

- Validação de entrada em todos os parâmetros
- Escape automático de SQL injection
- Logs de tentativas de acesso não autorizado
- Validação de sessão em todas as operações