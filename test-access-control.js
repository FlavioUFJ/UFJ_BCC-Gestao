/**
 * Script de teste para demonstrar o funcionamento do controle de acesso
 * Testa diferentes cenários de usuários e permissões
 */

const DatabaseHelper = require('./helpers/database-helper');
const AccessControl = require('./middleware/access-control');
const sqlite3 = require('sqlite3').verbose();

// Simular dados de usuários para teste
const testUsers = {
    admin: {
        id_pessoa: 1,
        nome: 'Administrador Teste',
        nivelacesso: 'Administrador'
    },
    orientador: {
        id_pessoa: 2,
        nome: 'Professor Orientador',
        nivelacesso: 'Operacional'
    },
    estagiario: {
        id_pessoa: 3,
        nome: 'Estudante Estagiário',
        nivelacesso: 'Visitante'
    }
};

async function testAccessControl() {
    console.log('🔒 TESTE DO SISTEMA DE CONTROLE DE ACESSO');
    console.log('=' .repeat(60));
    
    const dbHelper = new DatabaseHelper();
    
    try {
        // Teste 1: Verificar se usuários são administradores
        console.log('\n📋 TESTE 1: Verificação de Nível de Acesso');
        console.log('-'.repeat(40));
        
        for (const [userType, user] of Object.entries(testUsers)) {
            const isAdmin = await dbHelper.isAdmin(user);
            console.log(`${user.nome} (${user.nivelacesso}): ${isAdmin ? '👑 Admin' : '👤 Usuário Regular'}`);
        }
        
        // Teste 2: Consulta com filtros automáticos
        console.log('\n📊 TESTE 2: Consultas com Filtros Automáticos');
        console.log('-'.repeat(40));
        
        const baseQuery = `
            SELECT 
                ce.id_campo_estagio,
                pe.nome as nome_estagiario,
                po.nome as nome_orientador,
                ce.tipo_estagio,
                ce.situacao
            FROM campo_estagio ce
            LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
            LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
            ORDER BY ce.id_campo_estagio
        `;
        
        for (const [userType, user] of Object.entries(testUsers)) {
            console.log(`\n🔍 Consulta para ${user.nome}:`);
            try {
                const results = await dbHelper.select(baseQuery, [], user, 'campo_estagio');
                console.log(`   Registros encontrados: ${results.length}`);
                
                if (results.length > 0) {
                    console.log('   Primeiros registros:');
                    results.slice(0, 3).forEach((record, index) => {
                        console.log(`   ${index + 1}. ID: ${record.id_campo_estagio}, Estagiário: ${record.nome_estagiario || 'N/A'}`);
                    });
                }
            } catch (error) {
                console.log(`   ❌ Erro: ${error.message}`);
            }
        }
        
        // Teste 3: Demonstrar query filtrada vs não filtrada
        console.log('\n🔄 TESTE 3: Comparação Query Original vs Filtrada');
        console.log('-'.repeat(40));
        
        const accessControl = new AccessControl(new sqlite3.Database('./database.db'));
        const testUser = testUsers.orientador;
        
        console.log('Query Original:');
        console.log(baseQuery.trim());
        
        const filteredQuery = await accessControl.applyAccessFilter(baseQuery, testUser.id_pessoa, 'campo_estagio');
        console.log('\nQuery com Filtros de Acesso:');
        console.log(filteredQuery.trim());
        
        // Teste 4: Teste de condições de JOIN
        console.log('\n🔗 TESTE 4: Condições para JOINs Complexos');
        console.log('-'.repeat(40));
        
        for (const [userType, user] of Object.entries(testUsers)) {
            const joinConditions = await dbHelper.getJoinAccessConditions(user, 'ce');
            console.log(`\n${user.nome}:`);
            console.log(`   Condições: ${joinConditions}`);
        }
        
        // Teste 5: Simulação de operações CRUD
        console.log('\n✏️ TESTE 5: Simulação de Operações CRUD');
        console.log('-'.repeat(40));
        
        const testData = {
            id_pessoa_curso: 1,
            id_pessoa_estagiario: 3,
            id_pessoa_orientador: 2,
            tipo_estagio: 'Obrigatório',
            situacao: 'Em edição',
            semestre_ano: '2025/1'
        };
        
        for (const [userType, user] of Object.entries(testUsers)) {
            console.log(`\n${user.nome}:`);
            try {
                const canModify = await accessControl.canModifyRecord('campo_estagio', testData, user.id_pessoa);
                console.log(`   Pode modificar registro: ${canModify ? '✅ Sim' : '❌ Não'}`);
            } catch (error) {
                console.log(`   ❌ Erro ao verificar permissões: ${error.message}`);
            }
        }
        
        // Teste 6: Mapeamento de relações
        console.log('\n🗺️ TESTE 6: Mapeamento de Relações com Pessoa');
        console.log('-'.repeat(40));
        
        const relations = {
            'pessoa': ['id_pessoa'],
            'campo_estagio': ['id_pessoa_curso', 'id_pessoa_estagiario', 'id_pessoa_orientador', 'id_pessoa_concedente', 'id_pessoa_supervisor'],
            'pessoa_login': ['id_pessoa'],
            'usuario_modulos': ['id_pessoa']
        };
        
        console.log('Tabelas mapeadas para controle de acesso:');
        Object.entries(relations).forEach(([table, columns]) => {
            console.log(`   📋 ${table}: ${columns.join(', ')}`);
        });
        
        console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
        console.log('=' .repeat(60));
        
    } catch (error) {
        console.error('❌ Erro durante os testes:', error);
    } finally {
        dbHelper.close();
    }
}

// Função para demonstrar uso prático
async function demonstrateUsage() {
    console.log('\n💡 EXEMPLO DE USO PRÁTICO');
    console.log('=' .repeat(60));
    
    console.log(`
// 1. Instanciar o helper
const dbHelper = new DatabaseHelper();

// 2. Definir usuário da sessão
const user = {
    id_pessoa: req.session.user.id_pessoa,
    nivelacesso: req.session.user.nivelacesso
};

// 3. Executar consulta com filtros automáticos
const query = \`
    SELECT * FROM campo_estagio ce
    LEFT JOIN pessoa p ON ce.id_pessoa_estagiario = p.id_pessoa
    ORDER BY p.nome
\`;

const results = await dbHelper.select(query, [], user, 'campo_estagio');

// 4. Para operações de inserção/atualização
const newData = { id_pessoa_estagiario: user.id_pessoa, ... };
const insertResult = await dbHelper.insert('campo_estagio', newData, user);

// 5. Para queries complexas com JOINs
const joinConditions = await dbHelper.getJoinAccessConditions(user);
const complexQuery = \`
    SELECT ... FROM campo_estagio ce
    WHERE \${joinConditions}
\`;
`);
    
    console.log('\n📚 BENEFÍCIOS DO SISTEMA:');
    console.log('   ✅ Filtros automáticos baseados no usuário');
    console.log('   ✅ Validação de permissões em operações CRUD');
    console.log('   ✅ Suporte a múltiplas relações com Pessoa');
    console.log('   ✅ Fácil integração com rotas existentes');
    console.log('   ✅ Logs e auditoria automática');
    console.log('   ✅ Extensível para novas tabelas');
}

// Executar testes
if (require.main === module) {
    testAccessControl()
        .then(() => demonstrateUsage())
        .catch(console.error);
}

module.exports = {
    testAccessControl,
    demonstrateUsage,
    testUsers
};