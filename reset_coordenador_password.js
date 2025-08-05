const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const db = new sqlite3.Database('./database.db');

console.log('Redefinindo senha do coordenador...');

// Buscar o coordenador
db.get(`SELECT p.id_pessoa, p.nome, p.email 
        FROM pessoa p 
        INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa 
        WHERE p.email = 'coordenador@ufj.edu.br'`, async (err, user) => {
    if (err) {
        console.error('Erro ao buscar coordenador:', err);
        db.close();
        return;
    }
    
    if (!user) {
        console.log('❌ Coordenador não encontrado!');
        db.close();
        return;
    }
    
    console.log(`✓ Coordenador encontrado: ${user.nome} (${user.email})`);
    
    try {
        // Gerar hash da nova senha
        const novaSenha = '123456';
        const senhaHash = await bcrypt.hash(novaSenha, 10);
        
        // Atualizar senha
        db.run(`UPDATE pessoa_login SET senha = ? WHERE id_pessoa = ?`, 
               [senhaHash, user.id_pessoa], 
               function(err) {
            if (err) {
                console.error('Erro ao atualizar senha:', err);
            } else {
                console.log('✓ Senha do coordenador redefinida para: 123456');
                console.log('✓ Credenciais: coordenador@ufj.edu.br / 123456');
            }
            
            db.close();
        });
    } catch (error) {
        console.error('Erro ao gerar hash da senha:', error);
        db.close();
    }
});