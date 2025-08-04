const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

console.log('Verificando valores únicos do campo situacao na tabela campo_estagio...');

// Consultar valores únicos do campo situacao
db.all("SELECT DISTINCT situacao FROM campo_estagio WHERE situacao IS NOT NULL ORDER BY situacao", (err, rows) => {
    if (err) {
        console.error('Erro ao consultar valores de situacao:', err);
    } else {
        console.log('\nValores únicos encontrados no campo situacao:');
        if (rows.length === 0) {
            console.log('- Nenhum valor encontrado');
        } else {
            rows.forEach(row => {
                console.log(`- "${row.situacao}"`);
            });
        }
    }
    
    // Também verificar valores únicos do campo tipo_estagio
    db.all("SELECT DISTINCT tipo_estagio FROM campo_estagio WHERE tipo_estagio IS NOT NULL ORDER BY tipo_estagio", (err, rows) => {
        if (err) {
            console.error('Erro ao consultar valores de tipo_estagio:', err);
        } else {
            console.log('\nValores únicos encontrados no campo tipo_estagio:');
            if (rows.length === 0) {
                console.log('- Nenhum valor encontrado');
            } else {
                rows.forEach(row => {
                    console.log(`- "${row.tipo_estagio}"`);
                });
            }
        }
        
        // Verificar quantos registros existem na tabela
        db.get("SELECT COUNT(*) as count FROM campo_estagio", (err, result) => {
            if (err) {
                console.error('Erro ao contar registros:', err);
            } else {
                console.log(`\nTotal de registros na tabela campo_estagio: ${result.count}`);
            }
            db.close();
        });
    });
});