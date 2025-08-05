const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('Atualizando URL do módulo Estágio...');

// Primeiro, verificar a URL atual
db.get("SELECT nome, url FROM modulos WHERE nome = 'Estágio'", (err, row) => {
    if (err) {
        console.error('Erro ao consultar banco:', err);
        db.close();
        return;
    }
    
    if (row) {
        console.log(`URL atual: ${row.url}`);
        
        // Atualizar a URL para /estagios/dashboard
db.run("UPDATE modulos SET url = '/estagios/dashboard' WHERE nome = 'Estágio'", (err) => {
            if (err) {
                console.error('Erro ao atualizar URL:', err);
            } else {
                console.log('✓ URL do módulo Estágio atualizada com sucesso para /estagio/dashboard');
                
                // Verificar se a atualização foi bem-sucedida
                db.get("SELECT nome, url FROM modulos WHERE nome = 'Estágio'", (err, updatedRow) => {
                    if (err) {
                        console.error('Erro ao verificar atualização:', err);
                    } else if (updatedRow) {
                        console.log(`Nova URL: ${updatedRow.url}`);
                    }
                    db.close();
                });
            }
        });
    } else {
        console.log('Módulo Estágio não encontrado');
        db.close();
    }
});