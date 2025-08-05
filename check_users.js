const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('Verificando usuários no sistema...');

// Buscar todos os usuários com login
db.all(`SELECT p.nome, p.email, pl.tipoacesso, pl.status 
        FROM pessoa p 
        INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa 
        ORDER BY p.nome`, (err, users) => {
    if (err) {
        console.error('Erro ao buscar usuários:', err);
    } else {
        console.log('\n=== USUÁRIOS ENCONTRADOS ===');
        if (users.length === 0) {
            console.log('❌ Nenhum usuário encontrado!');
        } else {
            users.forEach(user => {
                console.log(`Nome: ${user.nome}`);
                console.log(`Email: ${user.email}`);
                console.log(`Tipo: ${user.tipoacesso}`);
                console.log(`Status: ${user.status}`);
                console.log('---');
            });
        }
    }
    
    // Verificar se existe o usuário admin@admin.com
    db.get(`SELECT p.nome, p.email, pl.tipoacesso, pl.status 
            FROM pessoa p 
            INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa 
            WHERE p.email = 'admin@admin.com'`, (err, admin) => {
        if (err) {
            console.error('Erro ao buscar admin:', err);
        } else {
            console.log('\n=== VERIFICAÇÃO DO ADMIN ===');
            if (admin) {
                console.log('✓ Usuário admin encontrado:');
                console.log(`Nome: ${admin.nome}`);
                console.log(`Email: ${admin.email}`);
                console.log(`Tipo: ${admin.tipoacesso}`);
                console.log(`Status: ${admin.status}`);
            } else {
                console.log('❌ Usuário admin@admin.com não encontrado!');
            }
        }
        
        db.close();
    });
});