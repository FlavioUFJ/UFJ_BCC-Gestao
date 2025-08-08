/**
 * Script de Verificação - Refatoração Concluída
 * 
 * Verifica se todas as correções relacionadas às tabelas deletadas foram aplicadas
 */

const fs = require('fs');
const path = require('path');

console.log('=== VERIFICAÇÃO DA REFATORAÇÃO ===\n');

// Função para verificar se um arquivo contém determinado texto
function checkFileContent(filePath, searchTerms, description) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const found = [];
        const notFound = [];
        
        searchTerms.forEach(term => {
            if (content.includes(term)) {
                found.push(term);
            } else {
                notFound.push(term);
            }
        });
        
        console.log(`📁 ${filePath}`);
        console.log(`   ${description}`);
        
        if (found.length > 0) {
            console.log(`   ❌ Ainda contém referências:`);
            found.forEach(term => console.log(`      - ${term}`));
        }
        
        if (notFound.length > 0) {
            console.log(`   ✅ Referências removidas:`);
            notFound.forEach(term => console.log(`      - ${term}`));
        }
        
        console.log('');
        return found.length === 0;
    } catch (error) {
        console.log(`   ⚠️  Erro ao ler arquivo: ${error.message}\n`);
        return false;
    }
}

// Verificações
const checks = [
    {
        file: 'routes/secure-routes.js',
        terms: [
            'campo_estagio_planoatividade',
            'relatorios_estagio',
            'total_planos',
            'total_relatorios',
            'GROUP BY ce.id_campo_estagio'
        ],
        description: 'Verificando remoção de JOINs e campos das tabelas deletadas'
    },
    {
        file: 'middleware/access-control.js',
        terms: [
            "'campo_estagio_planoatividade':",
            "'relatorios_estagio':"
        ],
        description: 'Verificando remoção das configurações de controle de acesso'
    },
    {
        file: 'CONTROLE-ACESSO.md',
        terms: [
            'campo_estagio_planoatividade',
            'relatorios_estagio'
        ],
        description: 'Verificando atualização da documentação'
    }
];

let allPassed = true;

checks.forEach(check => {
    const passed = checkFileContent(check.file, check.terms, check.description);
    if (!passed) {
        allPassed = false;
    }
});

console.log('=== RESUMO DA VERIFICAÇÃO ===\n');

if (allPassed) {
    console.log('✅ REFATORAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('   Todas as referências às tabelas deletadas foram removidas.\n');
    
    console.log('📋 PRÓXIMOS PASSOS:');
    console.log('   1. Testar o relatório completo (/relatorio-completo)');
    console.log('   2. Verificar se não há erros nos logs');
    console.log('   3. Testar funcionalidades de controle de acesso');
    console.log('   4. Verificar se outras funcionalidades não foram afetadas\n');
} else {
    console.log('❌ REFATORAÇÃO INCOMPLETA!');
    console.log('   Ainda existem referências às tabelas deletadas.');
    console.log('   Revise os arquivos marcados acima.\n');
}

console.log('🔍 VERIFICAÇÕES ADICIONAIS RECOMENDADAS:');
console.log('   - Buscar por "campo_estagio_planoatividade" em todo o projeto');
console.log('   - Buscar por "relatorios_estagio" em todo o projeto');
console.log('   - Verificar logs de erro da aplicação');
console.log('   - Testar todas as rotas principais\n');

console.log('=== FIM DA VERIFICAÇÃO ===');