const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

async function activateModules() {
    try {
        console.log('=== ATIVANDO MÓDULOS PARA O COORDENADOR ===');
        
        const coordenadorId = 1; // ID do coordenador
        
        // Ativar todos os módulos existentes para o coordenador
        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE usuario_modulos SET ativo = 1, dataultimaatualizacao = CURRENT_TIMESTAMP WHERE id_pessoa = ?',
                [coordenadorId],
                function(err) {
                    if (err) reject(err);
                    else {
                        console.log(`✓ ${this.changes} módulos ativados para o coordenador`);
                        resolve();
                    }
                }
            );
        });
        
        // Verificar módulos que não têm registro para o coordenador e criar
        const modulosSemAcesso = await new Promise((resolve, reject) => {
            db.all(
                `SELECT m.id_modulo, m.nome 
                 FROM modulos m 
                 WHERE m.ativo = 1 
                 AND m.id_modulo NOT IN (
                     SELECT um.id_modulo 
                     FROM usuario_modulos um 
                     WHERE um.id_pessoa = ?
                 )`,
                [coordenadorId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        console.log(`Módulos sem acesso: ${modulosSemAcesso.length}`);
        
        // Criar registros para módulos que não existem
        for (const modulo of modulosSemAcesso) {
            await new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO usuario_modulos (id_pessoa, id_modulo, ativo, dataCadastro, dataultimaatualizacao) VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
                    [coordenadorId, modulo.id_modulo],
                    function(err) {
                        if (err) reject(err);
                        else {
                            console.log(`✓ Acesso criado para módulo: ${modulo.nome}`);
                            resolve();
                        }
                    }
                );
            });
        }
        
        // Verificar resultado final
        const acessosAtivos = await new Promise((resolve, reject) => {
            db.all(
                `SELECT um.*, m.nome as nome_modulo 
                 FROM usuario_modulos um 
                 JOIN modulos m ON um.id_modulo = m.id_modulo 
                 WHERE um.id_pessoa = ? AND um.ativo = 1`,
                [coordenadorId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        console.log('\n=== MÓDULOS ATIVOS PARA O COORDENADOR ===');
        acessosAtivos.forEach(acesso => {
            console.log(`- ${acesso.nome_modulo}`);
        });
        
        console.log(`\nTotal de módulos ativos: ${acessosAtivos.length}`);
        
    } catch (error) {
        console.error('Erro:', error);
    } finally {
        db.close();
    }
}

activateModules();