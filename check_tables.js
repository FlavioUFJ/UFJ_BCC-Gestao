const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('Verificando estrutura das tabelas...');

// Listar todas as tabelas
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.error('Erro ao listar tabelas:', err);
        db.close();
        return;
    }
    
    console.log('\nTabelas encontradas:');
    tables.forEach(table => {
        console.log(`- ${table.name}`);
    });
    
    // Verificar estrutura da tabela pessoa se existir
    const pessoaTable = tables.find(t => t.name === 'pessoa');
    if (pessoaTable) {
        console.log('\n=== ESTRUTURA DA TABELA PESSOA ===');
        db.all("PRAGMA table_info(pessoa)", (err, columns) => {
            if (err) {
                console.error('Erro ao verificar estrutura da tabela pessoa:', err);
            } else {
                columns.forEach(col => {
                    console.log(`${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'NULL'} - ${col.pk ? 'PRIMARY KEY' : ''}`);
                });
            }
            
            // Verificar estrutura da tabela campo_estagio
            const campoEstagioTable = tables.find(t => t.name === 'campo_estagio');
            if (campoEstagioTable) {
                console.log('\n=== ESTRUTURA DA TABELA CAMPO_ESTAGIO ===');
                db.all("PRAGMA table_info(campo_estagio)", (err, columns) => {
                    if (err) {
                        console.error('Erro ao verificar estrutura da tabela campo_estagio:', err);
                    } else {
                        columns.forEach(col => {
                            console.log(`${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'NULL'} - ${col.pk ? 'PRIMARY KEY' : ''}`);
                        });
                    }
                    db.close();
                });
            } else {
                console.log('\nTabela campo_estagio não encontrada.');
                db.close();
            }
        });
    } else {
        console.log('\nTabela pessoa não encontrada.');
        
        // Verificar estrutura da tabela campo_estagio mesmo sem pessoa
        const campoEstagioTable = tables.find(t => t.name === 'campo_estagio');
        if (campoEstagioTable) {
            console.log('\n=== ESTRUTURA DA TABELA CAMPO_ESTAGIO ===');
            db.all("PRAGMA table_info(campo_estagio)", (err, columns) => {
                if (err) {
                    console.error('Erro ao verificar estrutura da tabela campo_estagio:', err);
                } else {
                    columns.forEach(col => {
                        console.log(`${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'NULL'} - ${col.pk ? 'PRIMARY KEY' : ''}`);
                    });
                }
                db.close();
            });
        } else {
            console.log('\nTabela campo_estagio não encontrada.');
            db.close();
        }
    }
});