const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

async function grantModuleAccess() {
    try {
        console.log('=== CONCEDENDO ACESSO AOS MÓDULOS ===');
        
        // Primeiro, vamos verificar o ID do coordenador
        const coordenador = await new Promise((resolve, reject) => {
            db.get(
                'SELECT id_pessoa, nome, email FROM pessoa WHERE email = ?',
                ['coordenador@ufj.edu.br'],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        if (!coordenador) {
            console.log('Coordenador não encontrado!');
            return;
        }
        
        console.log('Coordenador encontrado:', coordenador);
        
        // Buscar todos os módulos ativos
        const modulos = await new Promise((resolve, reject) => {
            db.all(
                'SELECT id_modulo, nome FROM modulos WHERE ativo = 1',
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        console.log('Módulos encontrados:', modulos.length);
        
        // Conceder acesso a todos os módulos para o coordenador
        for (const modulo of modulos) {
            try {
                await new Promise((resolve, reject) => {
                    db.run(
                        'INSERT OR REPLACE INTO usuario_modulos (id_pessoa, id_modulo, ativo, data_criacao) VALUES (?, ?, 1, datetime("now"))',
                        [coordenador.id_pessoa, modulo.id_modulo],
                        function(err) {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
                
                console.log(`✓ Acesso concedido ao módulo: ${modulo.nome}`);
            } catch (error) {
                console.error(`✗ Erro ao conceder acesso ao módulo ${modulo.nome}:`, error.message);
            }
        }
        
        // Verificar os acessos concedidos
        const acessos = await new Promise((resolve, reject) => {
            db.all(
                `SELECT um.*, m.nome as nome_modulo 
                 FROM usuario_modulos um 
                 JOIN modulos m ON um.id_modulo = m.id_modulo 
                 WHERE um.id_pessoa = ? AND um.ativo = 1`,
                [coordenador.id_pessoa],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        console.log('\n=== ACESSOS CONCEDIDOS ===');
        acessos.forEach(acesso => {
            console.log(`- ${acesso.nome_modulo}`);
        });
        
        console.log(`\nTotal de acessos: ${acessos.length}`);
        
    } catch (error) {
        console.error('Erro:', error);
    } finally {
        db.close();
    }
}

grantModuleAccess();