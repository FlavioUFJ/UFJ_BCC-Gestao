const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('Verificando URL do módulo Estágio...');

db.get("SELECT nome, url FROM modulos WHERE nome = 'Estágio'", (err, row) => {
    if (err) {
        console.error('Erro ao consultar banco:', err);
    } else if (row) {
        console.log(`Módulo: ${row.nome}`);
        console.log(`URL atual: ${row.url}`);
    } else {
        console.log('Módulo Estágio não encontrado');
    }
    
    db.close();
});