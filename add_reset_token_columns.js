const db = require('./src/config/database');

async function addResetTokenColumns() {
    try {
        console.log('Adicionando colunas de reset de senha na tabela pessoa...');
        
        // Adicionar coluna reset_token
        await db.run('ALTER TABLE pessoa ADD COLUMN reset_token TEXT');
        console.log('✓ Coluna reset_token adicionada');
        
        // Adicionar coluna reset_token_expiry
        await db.run('ALTER TABLE pessoa ADD COLUMN reset_token_expiry TEXT');
        console.log('✓ Coluna reset_token_expiry adicionada');
        
        console.log('\n✅ Colunas adicionadas com sucesso!');
        console.log('Agora o sistema pode gerenciar tokens de recuperação de senha.');
        
    } catch (error) {
        if (error.message.includes('duplicate column name')) {
            console.log('⚠️  As colunas já existem na tabela.');
        } else {
            console.error('❌ Erro ao adicionar colunas:', error);
        }
    }
}

addResetTokenColumns();