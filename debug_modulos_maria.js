const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('Investigando os módulos da Maria Eduarda...');

// Verificar se Maria Eduarda tem módulos vinculados
db.all("SELECT * FROM usuario_modulos WHERE id_pessoa = 35", (err, modulos) => {
    if (err) {
        console.error('Erro ao buscar módulos:', err);
    } else {
        console.log('\n=== MÓDULOS VINCULADOS À MARIA EDUARDA (ID: 35) ===');
        if (modulos.length === 0) {
            console.log('❌ NENHUM MÓDULO VINCULADO!');
            console.log('Isso explica por que ela não aparece na lista de usuários!');
            console.log('A query /admin/usuarios usa INNER JOIN com usuario_modulos WHERE ativo = 1');
        } else {
            modulos.forEach(modulo => {
                console.log(`Módulo ID: ${modulo.id_modulo}, Ativo: ${modulo.ativo}`);
            });
        }
    }
    
    // Verificar estrutura da tabela usuario_modulos
    console.log('\n=== ESTRUTURA DA TABELA USUARIO_MODULOS ===');
    db.all("PRAGMA table_info(usuario_modulos)", (err, columns) => {
        if (err) {
            console.error('Erro ao verificar estrutura:', err);
        } else {
            columns.forEach(col => {
                console.log(`${col.name} (${col.type})`);
            });
        }
        
        // Verificar todos os módulos disponíveis
        console.log('\n=== MÓDULOS DISPONÍVEIS NO SISTEMA ===');
        db.all("SELECT * FROM modulos ORDER BY ordem", (err, todosModulos) => {
            if (err) {
                console.error('Erro ao buscar módulos:', err);
            } else {
                todosModulos.forEach(modulo => {
                    console.log(`ID: ${modulo.id_modulo}, Nome: ${modulo.nome}, URL: ${modulo.url}, Ativo: ${modulo.ativo}`);
                });
            }
            
            // Testar a query exata da rota /admin/usuarios
            console.log('\n=== TESTANDO QUERY EXATA DA ROTA /admin/usuarios ===');
            const queryExata = `
                SELECT DISTINCT
                    p.id_pessoa,
                    p.nome,
                    p.email,
                    pl.status,
                    pl.tipoacesso,
                    pl.dataultimaatualizacao
                FROM pessoa p
                INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa
                INNER JOIN usuario_modulos um ON p.id_pessoa = um.id_pessoa
                WHERE um.ativo = 1 AND p.nome LIKE '%Maria Eduarda%'
                ORDER BY p.nome
            `;
            
            db.all(queryExata, (err, resultado) => {
                if (err) {
                    console.error('Erro na query exata:', err);
                } else {
                    console.log('Resultado da query exata:');
                    if (resultado.length === 0) {
                        console.log('❌ Maria Eduarda NÃO aparece na query da rota /admin/usuarios!');
                        console.log('Motivo: Ela não tem módulos ativos vinculados.');
                    } else {
                        console.log('✅ Maria Eduarda aparece na query:', resultado);
                    }
                }
                db.close();
            });
        });
    });
});