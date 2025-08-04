const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('Investigando o caso de Maria Eduarda Almeida Lopes...');

// Buscar Maria Eduarda na tabela pessoa
db.all("SELECT * FROM pessoa WHERE nome LIKE '%Maria Eduarda%' OR nome LIKE '%Almeida Lopes%'", (err, pessoas) => {
    if (err) {
        console.error('Erro ao buscar na tabela pessoa:', err);
    } else {
        console.log('\n=== PESSOAS ENCONTRADAS NA TABELA PESSOA ===');
        pessoas.forEach(pessoa => {
            console.log(`ID: ${pessoa.id_pessoa}, Nome: ${pessoa.nome}, Email: ${pessoa.email}, Categoria: ${pessoa.categoria}`);
        });
        
        if (pessoas.length > 0) {
            // Para cada pessoa encontrada, verificar se tem login
            pessoas.forEach(pessoa => {
                db.get("SELECT * FROM pessoa_login WHERE id_pessoa = ?", [pessoa.id_pessoa], (err, login) => {
                    if (err) {
                        console.error(`Erro ao buscar login para pessoa ${pessoa.id_pessoa}:`, err);
                    } else {
                        console.log(`\n=== LOGIN PARA ${pessoa.nome} (ID: ${pessoa.id_pessoa}) ===`);
                        if (login) {
                            console.log('Login encontrado:', login);
                        } else {
                            console.log('❌ NENHUM LOGIN ENCONTRADO - Esta pessoa não aparecerá na lista de usuários!');
                        }
                    }
                });
            });
        } else {
            console.log('❌ Nenhuma pessoa encontrada com esse nome!');
        }
    }
    
    // Verificar também a query da rota pessoas-sem-login
    setTimeout(() => {
        console.log('\n=== TESTANDO QUERY DA ROTA PESSOAS-SEM-LOGIN ===');
        const query = `
            SELECT p.id_pessoa, p.nome, p.email, p.categoria
            FROM pessoa p
            LEFT JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa
            WHERE pl.id_pessoa IS NULL
            AND (p.nome LIKE '%Maria Eduarda%' OR p.nome LIKE '%Almeida Lopes%')
            ORDER BY p.nome
        `;
        
        db.all(query, (err, rows) => {
            if (err) {
                console.error('Erro na query pessoas-sem-login:', err);
            } else {
                console.log('Pessoas sem login encontradas:', rows);
                if (rows.length === 0) {
                    console.log('❌ Maria Eduarda não aparece na lista de pessoas sem login!');
                    console.log('Isso significa que ela JÁ TEM LOGIN ou não existe na tabela pessoa.');
                }
            }
            db.close();
        });
    }, 1000);
});