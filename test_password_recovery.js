const emailConfig = require('./src/config/email');
const db = require('./src/config/database');

async function testPasswordRecovery() {
    try {
        console.log('=== TESTE DE RECUPERAÇÃO DE SENHA ===\n');
        
        // Carregar configuração de email
        await emailConfig.loadConfig();
        
        console.log('1. Configuração de email carregada com sucesso\n');
        
        // Testar se consegue criar o transporter
        await emailConfig.createTransporter();
        console.log('2. Transporter criado com sucesso\n');
        
        // Verificar se existe algum usuário no sistema para teste
        const usuarios = await db.all('SELECT email FROM pessoa WHERE email IS NOT NULL LIMIT 3');
        console.log('3. Usuários encontrados no sistema:');
        usuarios.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.email}`);
        });
        
        if (usuarios.length === 0) {
            console.log('   Nenhum usuário com email encontrado.');
            return;
        }
        
        console.log('\n4. Testando template de email...');
        const resetLink = 'http://localhost:3000/reset-password?token=exemplo123';
        const emailHtml = emailConfig.constructor.templates.recuperacaoSenha('Usuário Teste', resetLink);
        console.log('   Template gerado com sucesso');
        console.log('   Tamanho do HTML:', emailHtml.length, 'caracteres\n');
        
        console.log('5. Sistema de recuperação de senha está configurado e pronto para uso!');
        console.log('\n=== CONFIGURAÇÕES ATUAIS ===');
        console.log('Host:', emailConfig.config.host);
        console.log('Porta:', emailConfig.config.port);
        console.log('Usuário:', emailConfig.config.user ? emailConfig.config.user.substring(0, 3) + '***' : 'não definido');
        console.log('Email de origem:', emailConfig.config.from);
        
    } catch (error) {
        console.error('Erro no teste:', error);
    }
}

testPasswordRecovery();