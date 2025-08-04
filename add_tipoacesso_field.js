const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('Adicionando campo tipoacesso à tabela pessoa_login...');

db.serialize(() => {
    // Adicionar o campo tipoacesso com valor padrão 'Operacional'
    db.run(`ALTER TABLE pessoa_login ADD COLUMN tipoacesso TEXT DEFAULT 'Operacional'`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✓ Campo tipoacesso já existe na tabela pessoa_login');
            } else {
                console.error('Erro ao adicionar campo tipoacesso:', err);
                return;
            }
        } else {
            console.log('✓ Campo tipoacesso adicionado com sucesso à tabela pessoa_login');
        }
        
        // Atualizar o registro do coordenador para 'Administrador'
        db.run(`UPDATE pessoa_login 
                SET tipoacesso = 'Administrador' 
                WHERE id_pessoa IN (
                    SELECT id_pessoa FROM pessoa WHERE email = 'coordenador@ufj.edu.br' OR categoria = 'Coordenador'
                )`, (err) => {
            if (err) {
                console.error('Erro ao atualizar tipoacesso do coordenador:', err);
            } else {
                console.log('✓ Tipoacesso do coordenador atualizado para Administrador');
            }
            
            // Verificar a estrutura atualizada
            console.log('\n=== ESTRUTURA ATUALIZADA DA TABELA PESSOA_LOGIN ===');
            db.all("PRAGMA table_info(pessoa_login)", (err, columns) => {
                if (err) {
                    console.error('Erro ao verificar estrutura:', err);
                } else {
                    columns.forEach(col => {
                        console.log(`${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'NULL'} - ${col.pk ? 'PRIMARY KEY' : ''} - Default: ${col.dflt_value || 'NULL'}`);
                    });
                }
                
                // Mostrar alguns registros atualizados
                console.log('\n=== REGISTROS ATUALIZADOS ===');
                db.all(`SELECT pl.*, p.nome, p.email, p.categoria 
                        FROM pessoa_login pl 
                        INNER JOIN pessoa p ON pl.id_pessoa = p.id_pessoa 
                        LIMIT 5`, (err, rows) => {
                    if (err) {
                        console.error('Erro ao buscar registros:', err);
                    } else {
                        rows.forEach(row => {
                            console.log(`${row.nome} (${row.email}) - Categoria: ${row.categoria} - TipoAcesso: ${row.tipoacesso}`);
                        });
                    }
                    db.close();
                });
            });
        });
    });
});