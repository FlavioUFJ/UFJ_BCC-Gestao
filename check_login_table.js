const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('Verificando estrutura da tabela pessoa_login...');

// Verificar estrutura da tabela pessoa_login
db.all("PRAGMA table_info(pessoa_login)", (err, columns) => {
    if (err) {
        console.error('Erro ao verificar estrutura da tabela pessoa_login:', err);
    } else {
        console.log('\n=== ESTRUTURA DA TABELA PESSOA_LOGIN ===');
        columns.forEach(col => {
            console.log(`${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'NULL'} - ${col.pk ? 'PRIMARY KEY' : ''}`);
        });
    }
    
    // Verificar alguns registros da tabela
    db.all("SELECT * FROM pessoa_login LIMIT 5", (err, rows) => {
        if (err) {
            console.error('Erro ao buscar registros:', err);
        } else {
            console.log('\n=== REGISTROS EXEMPLO ===');
            console.log(rows);
        }
        db.close();
    });
});