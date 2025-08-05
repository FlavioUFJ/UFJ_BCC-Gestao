const emailConfig = require('./src/config/email');
const db = require('./src/config/database');

async function testEmailSend() {
    try {
        console.log('=== TESTE DE ENVIO DE EMAIL ===\n');
        
        // Carregar configuração
        await emailConfig.loadConfig();
        console.log('✓ Configuração carregada');
        
        // Criar transporter
        const transporter = await emailConfig.createTransporter();
        console.log('✓ Transporter criado');
        
        // Testar conexão SMTP
        console.log('\nTestando conexão SMTP...');
        await transporter.verify();
        console.log('✓ Conexão SMTP verificada com sucesso');
        
        // Buscar um usuário para teste
        const user = await db.get('SELECT * FROM pessoa WHERE email = ?', ['adailtonvieira@discente.ufj.edu.br']);
        
        if (!user) {
            console.log('❌ Usuário não encontrado');
            return;
        }
        
        console.log(`\n✓ Usuário encontrado: ${user.nome} (${user.email})`);
        
        // Gerar template de email
        const resetUrl = 'http://localhost:3000/auth/reset-password/token123';
        const htmlContent = emailConfig.constructor.templates.recuperacaoSenha(
            user.nome,
            resetUrl
        );
        
        console.log('✓ Template gerado');
        
        // Tentar enviar email
        console.log('\nEnviando email de teste...');
        const result = await emailConfig.enviarEmail(
            user.email,
            'Teste - Recuperação de Senha',
            htmlContent
        );
        
        console.log('✅ EMAIL ENVIADO COM SUCESSO!');
        console.log('Detalhes:', {
            messageId: result.messageId,
            accepted: result.accepted,
            rejected: result.rejected
        });
        
    } catch (error) {
        console.error('❌ ERRO no teste:', error.message);
        console.error('Detalhes do erro:', error);
    }
}

testEmailSend().then(() => {
    console.log('\n=== TESTE CONCLUÍDO ===');
    process.exit(0);
}).catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
});