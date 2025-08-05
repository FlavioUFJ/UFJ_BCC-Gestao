const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('Investigando as categorias de pessoa...');

// Verificar se existe tabela de parâmetros com categorias
db.all("SELECT * FROM parametro WHERE chave LIKE '%categoria%'", (err, params) => {
    if (err) {
        console.error('Erro ao buscar parâmetros de categoria:', err);
    } else {
        console.log('\n=== PARÂMETROS DE CATEGORIA ===');
        console.log(params);
    }
    
    // Verificar valores únicos de categoria na tabela pessoa
    db.all("SELECT DISTINCT categoria FROM pessoa ORDER BY categoria", (err, categorias) => {
        if (err) {
            console.error('Erro ao buscar categorias:', err);
        } else {
            console.log('\n=== CATEGORIAS ÚNICAS NA TABELA PESSOA ===');
            categorias.forEach(cat => {
                console.log(`Categoria: ${cat.categoria}`);
            });
        }
        
        // Buscar pessoas da categoria 3 especificamente
        db.all("SELECT * FROM pessoa WHERE categoria = '3' OR categoria = 3", (err, pessoas) => {
            if (err) {
                console.error('Erro ao buscar pessoas da categoria 3:', err);
            } else {
                console.log('\n=== PESSOAS DA CATEGORIA 3 ===');
                pessoas.forEach(pessoa => {
                    console.log(`ID: ${pessoa.id_pessoa}, Nome: ${pessoa.nome}, Categoria: ${pessoa.categoria}`);
                });
            }
            
            // Verificar se existe tabela de valores de parâmetros
            db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%valor%'", (err, tables) => {
                if (err) {
                    console.error('Erro ao buscar tabelas:', err);
                } else {
                    console.log('\n=== TABELAS COM "VALOR" NO NOME ===');
                    console.log(tables);
                    
                    if (tables.length > 0) {
                        // Se encontrou tabelas, verificar a primeira
                        const tableName = tables[0].name;
                        db.all(`SELECT * FROM ${tableName} WHERE valor LIKE '%Aluno%' OR valor LIKE '%Estagiário%'`, (err, valores) => {
                            if (err) {
                                console.error(`Erro ao buscar valores na tabela ${tableName}:`, err);
                            } else {
                                console.log(`\n=== VALORES RELACIONADOS A ALUNO/ESTAGIÁRIO NA TABELA ${tableName} ===`);
                                console.log(valores);
                            }
                            db.close();
                        });
                    } else {
                        db.close();
                    }
                }
            });
        });
    });
});