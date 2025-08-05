const db = require('./src/config/database');

async function checkEmailConfig() {
    try {
        // Verificar tabelas relacionadas a parametro
        const tables = await db.all('SELECT name FROM sqlite_master WHERE type="table" AND name LIKE "%parametro%"');
        console.log('Tabelas relacionadas a parametro:');
        tables.forEach(table => console.log(table.name));
        
        // Verificar se existe tabela parametrovalor
        const parametroValor = await db.all('SELECT * FROM parametrovalor WHERE identificador LIKE "email_%" LIMIT 5').catch(() => []);
        console.log('\nConfiguracoes de email na tabela parametrovalor:');
        if (parametroValor.length === 0) {
            console.log('Nenhuma configuração de email encontrada.');
        } else {
            parametroValor.forEach(row => {
                console.log(`${row.identificador}: ${row.valor}`);
            });
        }
    } catch (error) {
        console.error('Erro ao verificar configurações:', error);
    }
}

checkEmailConfig();