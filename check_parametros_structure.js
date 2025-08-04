const sqlite3 = require('sqlite3').verbose();

// Conectar ao banco de dados
const db = new sqlite3.Database('./database.db');

console.log('Verificando estrutura das tabelas de parâmetros...');

db.serialize(() => {
    // Verificar se as tabelas existem
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%parametro%'", (err, tables) => {
        if (err) {
            console.error('Erro ao verificar tabelas:', err);
            return;
        }
        
        console.log('\nTabelas encontradas:', tables.map(t => t.name));
        
        // Verificar estrutura da tabela parametro se existir
        if (tables.some(t => t.name === 'parametro')) {
            console.log('\n--- Estrutura da tabela parametro ---');
            db.all("PRAGMA table_info(parametro)", (err, columns) => {
                if (err) {
                    console.error('Erro ao verificar estrutura da tabela parametro:', err);
                } else {
                    console.log('Colunas da tabela parametro:');
                    columns.forEach(col => {
                        console.log(`- ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
                    });
                }
            });
        }
        
        // Verificar estrutura da tabela parametrovalor se existir
        if (tables.some(t => t.name === 'parametrovalor')) {
            console.log('\n--- Estrutura da tabela parametrovalor ---');
            db.all("PRAGMA table_info(parametrovalor)", (err, columns) => {
                if (err) {
                    console.error('Erro ao verificar estrutura da tabela parametrovalor:', err);
                } else {
                    console.log('Colunas da tabela parametrovalor:');
                    columns.forEach(col => {
                        console.log(`- ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
                    });
                }
                
                // Fechar conexão após verificar tudo
                setTimeout(() => {
                    db.close((err) => {
                        if (err) {
                            console.error('Erro ao fechar conexão:', err);
                        } else {
                            console.log('\n✓ Verificação concluída');
                        }
                    });
                }, 100);
            });
        } else {
            // Se não existe parametrovalor, fechar conexão
            setTimeout(() => {
                db.close((err) => {
                    if (err) {
                        console.error('Erro ao fechar conexão:', err);
                    } else {
                        console.log('\n✓ Verificação concluída');
                    }
                });
            }, 100);
        }
    });
});