const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const db = new sqlite3.Database('./database.db');

console.log('Criando usuário administrador padrão...');

db.serialize(() => {
    // Primeiro, verificar se já existe um usuário admin
    db.get(`SELECT p.id_pessoa FROM pessoa p 
            INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa 
            WHERE p.email = 'admin@admin.com'`, (err, row) => {
        if (err) {
            console.error('Erro ao verificar usuário existente:', err);
            return;
        }
        
        if (row) {
            console.log('✓ Usuário admin@admin.com já existe');
            db.close();
            return;
        }
        
        // Criar pessoa admin
        db.run(`INSERT INTO pessoa (nome, email, tipo, categoria, dataCadastro, dataultimaatualizacao) 
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Admin', 'admin@admin.com', 'F', '1', new Date().toISOString(), new Date().toISOString()], 
                function(err) {
            if (err) {
                console.error('Erro ao criar pessoa admin:', err);
                return;
            }
            
            const pessoaId = this.lastID;
            console.log('✓ Pessoa admin criada com ID:', pessoaId);
            
            // Hash da senha
            const senhaHash = bcrypt.hashSync('123456', 10);
            
            // Criar login admin
            db.run(`INSERT INTO pessoa_login (id_pessoa, senha, tipoacesso, status) 
                    VALUES (?, ?, ?, ?)`, 
                    [pessoaId, senhaHash, 'Administrador', 'Ativo'], 
                    function(err) {
                if (err) {
                    console.error('Erro ao criar login admin:', err);
                    return;
                }
                
                console.log('✓ Login admin criado com sucesso');
                console.log('✓ Credenciais: admin@admin.com / 123456');
                
                // Verificar se foi criado corretamente
                db.get(`SELECT p.nome, p.email, pl.tipoacesso, pl.status 
                        FROM pessoa p 
                        INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa 
                        WHERE p.email = 'admin@admin.com'`, (err, user) => {
                    if (err) {
                        console.error('Erro ao verificar usuário criado:', err);
                    } else if (user) {
                        console.log('✓ Usuário verificado:', user);
                    }
                    
                    db.close();
                });
            });
        });
    });
});