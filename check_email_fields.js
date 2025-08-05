const db = require('./src/config/database');

async function checkEmailFields() {
    try {
        console.log('=== CAMPOS DE EMAIL NAS TABELAS ===\n');
        
        // Obter todas as tabelas
        const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
        
        for (const table of tables) {
            console.log(`=== TABELA: ${table.name} ===`);
            
            // Obter informações das colunas
            const columns = await db.all(`PRAGMA table_info(${table.name})`);
            
            // Filtrar apenas colunas que contêm 'email'
            const emailColumns = columns.filter(col => col.name.includes('email'));
            
            if (emailColumns.length > 0) {
                emailColumns.forEach(col => {
                    console.log(`  - ${col.name} (${col.type})`);
                });
            } else {
                console.log('  Nenhum campo de email encontrado');
            }
            console.log('');
        }
        
        // Verificar especificamente os campos mencionados
        console.log('=== VERIFICAÇÃO DOS CAMPOS ESPECÍFICOS ===');
        const emailFields = [
            'email_estagiario',
            'email_supervisor', 
            'email_orientador',
            'email_coordenador',
            'email_concedente',
            'email_curso',
            'email_empresa'
        ];
        
        for (const field of emailFields) {
            console.log(`\nCampo: ${field}`);
            let found = false;
            
            for (const table of tables) {
                const columns = await db.all(`PRAGMA table_info(${table.name})`);
                const hasField = columns.some(col => col.name === field);
                
                if (hasField) {
                    const column = columns.find(col => col.name === field);
                    console.log(`  ✓ Encontrado na tabela: ${table.name} (${column.type})`);
                    found = true;
                }
            }
            
            if (!found) {
                console.log(`  ✗ Não encontrado em nenhuma tabela`);
            }
        }
        
    } catch (error) {
        console.error('Erro:', error);
    }
}

checkEmailFields();