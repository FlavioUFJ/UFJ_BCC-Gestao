const databaseConfig = require('./src/config/database');

console.log('Iniciando migração: renomeando coluna "fase" para "situacao"...');

async function migrate() {
    try {
        // Verificar se a coluna 'situacao' já existe
        const columns = await databaseConfig.all("SHOW COLUMNS FROM campo_estagio");
        
        const hasSituacao = columns.some(col => col.Field === 'situacao');
        const hasFase = columns.some(col => col.Field === 'fase');
        
        if (hasSituacao) {
            console.log('Coluna "situacao" já existe. Migração não necessária.');
            await databaseConfig.close();
            return;
        }
        
        if (!hasFase) {
            console.log('Coluna "fase" não encontrada. Criando coluna "situacao"...');
            await databaseConfig.run('ALTER TABLE campo_estagio ADD COLUMN situacao TEXT');
            console.log('Coluna "situacao" criada com sucesso.');
            await databaseConfig.close();
            return;
        }
        
        console.log('Executando migração...');
        
        // Passo 1: Adicionar nova coluna 'situacao'
        await databaseConfig.run('ALTER TABLE campo_estagio ADD COLUMN situacao TEXT');
        console.log('Coluna "situacao" adicionada.');
        
        // Passo 2: Copiar dados da coluna 'fase' para 'situacao', convertendo valores antigos
        await databaseConfig.run(`UPDATE campo_estagio SET situacao = 
            CASE 
                WHEN fase = 'Iniciado' THEN 'Em andamento'
                WHEN fase = 'Com pendência' THEN 'Pendente'
                WHEN fase = 'Cancelado' THEN 'Cancelado'
                WHEN fase = 'Concluído' THEN 'Concluído'
                WHEN fase = 'Arquivado' THEN 'Arquivado'
                ELSE 'Indefinido'
            END
            WHERE fase IS NOT NULL`);
        
        console.log('Dados copiados e convertidos para nova coluna.');
        
        // Passo 3: Verificar quantos registros foram atualizados
        const result = await databaseConfig.get('SELECT COUNT(*) as count FROM campo_estagio WHERE situacao IS NOT NULL');
        console.log(`${result.count} registros atualizados com nova situação.`);
        
        // Passo 4: Remover a coluna antiga 'fase' (MySQL/MariaDB não suporta DROP COLUMN diretamente em algumas versões)
        // Vamos apenas deixar a coluna antiga por segurança
        console.log('Coluna "fase" mantida por segurança. Você pode removê-la manualmente se desejar.');
        
        console.log('Migração concluída com sucesso!');
        
        // Mostrar algumas amostras dos dados migrados
        const samples = await databaseConfig.all('SELECT fase, situacao FROM campo_estagio WHERE fase IS NOT NULL LIMIT 5');
        console.log('\nAmostras dos dados migrados:');
        samples.forEach(row => {
            console.log(`  ${row.fase} -> ${row.situacao}`);
        });
        
        await databaseConfig.close();
        
    } catch (error) {
        console.error('Erro durante a migração:', error);
        try {
            await databaseConfig.close();
        } catch (closeError) {
            console.error('Erro ao fechar conexão:', closeError);
        }
        process.exit(1);
    }
}

// Executar a migração
migrate();