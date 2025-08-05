const db = require('./src/config/database');

async function checkParametros() {
    try {
        const params = await db.all('SELECT * FROM parametro');
        console.log('=== PARÂMETROS EXISTENTES ===');
        params.forEach(p => {
            console.log(`ID: ${p.id_parametro}, Identificador: "${p.identificador}", Descrição: ${p.descricao}`);
        });
        
        console.log('\n=== VALORES DOS PARÂMETROS ===');
        const valores = await db.all('SELECT * FROM parametrovalor ORDER BY id_parametro');
        valores.forEach(v => {
            console.log(`Parâmetro ID: ${v.id_parametro}, Identificador: "${v.identificadorvalor}", Valor: "${v.valor}"`);
        });
    } catch (error) {
        console.error('Erro:', error);
    }
}

checkParametros();