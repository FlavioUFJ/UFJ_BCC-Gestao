const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('Investigando a tabela parametrovalor...');

// Verificar estrutura da tabela parametrovalor
db.all("PRAGMA table_info(parametrovalor)", (err, columns) => {
    if (err) {
        console.error('Erro ao verificar estrutura:', err);
    } else {
        console.log('\n=== ESTRUTURA DA TABELA PARAMETROVALOR ===');
        columns.forEach(col => {
            console.log(`${col.name} (${col.type})`);
        });
    }
    
    // Buscar todos os valores da tabela
    db.all("SELECT * FROM parametrovalor ORDER BY id_parametro, id_parametrovalor", (err, valores) => {
        if (err) {
            console.error('Erro ao buscar valores:', err);
        } else {
            console.log('\n=== TODOS OS VALORES DA TABELA PARAMETROVALOR ===');
            valores.forEach(valor => {
                console.log(`ID: ${valor.id_parametrovalor}, Parâmetro: ${valor.id_parametro}, Identificador: ${valor.identificadorvalor}, Valor: ${valor.valor}`);
            });
            
            // Buscar parâmetros relacionados
            db.all("SELECT * FROM parametros WHERE id IN (SELECT DISTINCT id_parametro FROM parametrovalor)", (err, params) => {
                if (err) {
                    console.error('Erro ao buscar parâmetros:', err);
                } else {
                    console.log('\n=== PARÂMETROS RELACIONADOS ===');
                    params.forEach(param => {
                        console.log(`ID: ${param.id}, Chave: ${param.chave}, Descrição: ${param.descricao}`);
                    });
                    
                    // Buscar especificamente o parâmetro de categoria
                    const categoriaParam = params.find(p => p.chave && p.chave.toLowerCase().includes('categoria'));
                    if (categoriaParam) {
                        console.log('\n=== VALORES DO PARÂMETRO DE CATEGORIA ===');
                        db.all("SELECT * FROM parametrovalor WHERE id_parametro = ? ORDER BY id_parametrovalor", [categoriaParam.id], (err, catValues) => {
                            if (err) {
                                console.error('Erro ao buscar valores de categoria:', err);
                            } else {
                                catValues.forEach((val, index) => {
                                    console.log(`ID ${val.id_parametrovalor}: ${val.valor} (Identificador: ${val.identificadorvalor})`);
                                    if (val.identificadorvalor == '3' || val.id_parametrovalor == 3) {
                                        console.log(`  ⭐ Esta é a categoria 3: ${val.valor}`);
                                    }
                                });
                            }
                            db.close();
                        });
                    } else {
                        console.log('\n❌ Não foi encontrado parâmetro de categoria!');
                        db.close();
                    }
                }
            });
        }
    });
});