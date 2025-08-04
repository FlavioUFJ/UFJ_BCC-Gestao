const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('Analisando relações do banco de dados...');

// Função para analisar foreign keys de uma tabela
function analyzeForeignKeys(tableName) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA foreign_key_list(${tableName})`, (err, foreignKeys) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(foreignKeys);
        });
    });
}

// Função para obter estrutura de uma tabela
function getTableStructure(tableName) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(columns);
        });
    });
}

// Função para listar todas as tabelas
function getAllTables() {
    return new Promise((resolve, reject) => {
        db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, tables) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(tables.map(t => t.name));
        });
    });
}

// Função principal de análise
async function analyzeDatabase() {
    try {
        const tables = await getAllTables();
        console.log('\n=== TABELAS ENCONTRADAS ===');
        tables.forEach(table => console.log(`- ${table}`));
        
        const pessoaRelations = [];
        
        console.log('\n=== ANÁLISE DE RELAÇÕES COM PESSOA ===');
        
        for (const tableName of tables) {
            const structure = await getTableStructure(tableName);
            const foreignKeys = await analyzeForeignKeys(tableName);
            
            // Procurar por colunas que referenciam pessoa
            const pessoaColumns = structure.filter(col => 
                col.name.includes('id_pessoa') || 
                col.name.includes('pessoa_id') ||
                (foreignKeys.some(fk => fk.table === 'pessoa' && fk.from === col.name))
            );
            
            if (pessoaColumns.length > 0) {
                console.log(`\n--- ${tableName.toUpperCase()} ---`);
                pessoaColumns.forEach(col => {
                    console.log(`  ${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'NULL'}`);
                });
                
                pessoaRelations.push({
                    table: tableName,
                    columns: pessoaColumns.map(col => col.name),
                    foreignKeys: foreignKeys.filter(fk => fk.table === 'pessoa')
                });
            }
        }
        
        console.log('\n=== MAPEAMENTO DE RELAÇÕES PESSOA ===');
        pessoaRelations.forEach(relation => {
            console.log(`\nTabela: ${relation.table}`);
            console.log(`Colunas relacionadas a Pessoa: ${relation.columns.join(', ')}`);
            if (relation.foreignKeys.length > 0) {
                console.log('Foreign Keys:');
                relation.foreignKeys.forEach(fk => {
                    console.log(`  ${fk.from} -> pessoa.${fk.to}`);
                });
            }
        });
        
        // Análise específica da tabela campo_estagio
        console.log('\n=== ANÁLISE DETALHADA: CAMPO_ESTAGIO ===');
        const campoEstagioStructure = await getTableStructure('campo_estagio');
        const campoEstagioFKs = await analyzeForeignKeys('campo_estagio');
        
        console.log('Estrutura completa:');
        campoEstagioStructure.forEach(col => {
            console.log(`  ${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'NULL'} - ${col.pk ? 'PK' : ''}`);
        });
        
        console.log('\nForeign Keys:');
        campoEstagioFKs.forEach(fk => {
            console.log(`  ${fk.from} -> ${fk.table}.${fk.to}`);
        });
        
        return pessoaRelations;
        
    } catch (error) {
        console.error('Erro na análise:', error);
    } finally {
        db.close();
    }
}

// Executar análise
analyzeDatabase().then(relations => {
    console.log('\n=== RESUMO PARA IMPLEMENTAÇÃO ===');
    console.log('Tabelas que referenciam Pessoa:', relations.length);
    relations.forEach(rel => {
        console.log(`- ${rel.table}: ${rel.columns.join(', ')}`);
    });
});