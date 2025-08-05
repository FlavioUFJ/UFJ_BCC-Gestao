const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

async function checkUsuarioModulos() {
    try {
        console.log('=== ESTRUTURA DA TABELA USUARIO_MODULOS ===');
        
        // Verificar estrutura da tabela
        const structure = await new Promise((resolve, reject) => {
            db.all(
                'PRAGMA table_info(usuario_modulos)',
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        structure.forEach(col => {
            console.log(`${col.name} (${col.type}) - ${col.dflt_value || 'NULL'} - ${col.pk ? 'PRIMARY KEY' : ''}`);
        });
        
        console.log('\n=== DADOS EXISTENTES ===');
        const data = await new Promise((resolve, reject) => {
            db.all(
                'SELECT * FROM usuario_modulos',
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        console.log('Registros encontrados:', data.length);
        data.forEach(row => {
            console.log(row);
        });
        
    } catch (error) {
        console.error('Erro:', error);
    } finally {
        db.close();
    }
}

checkUsuarioModulos();