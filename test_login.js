const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

// Conectar ao banco de dados
const db = new sqlite3.Database('./database.db');

// Buscar dados de uma pessoa com login para testar
const query = `
    SELECT p.*, pl.senha, pl.tipoacesso, pl.status
    FROM pessoa p
    INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa
    WHERE pl.status = 'Ativo'
    LIMIT 1
`;

db.get(query, (err, user) => {
    if (err) {
        console.error('Erro ao buscar usuário:', err);
        db.close();
        return;
    }
    
    if (!user) {
        console.log('Nenhum usuário ativo encontrado.');
        db.close();
        return;
    }
    
    console.log('Usuário encontrado:');
    console.log(`ID: ${user.id_pessoa}`);
    console.log(`Nome: ${user.nome}`);
    console.log(`Email: ${user.email}`);
    console.log(`Tipo Acesso: ${user.tipoacesso}`);
    console.log(`Status: ${user.status}`);
    
    // Testar login com este usuário
    console.log('\n=== TESTANDO LOGIN ===');
    console.log(`Tentando login com email: ${user.email}`);
    
    db.close();
});