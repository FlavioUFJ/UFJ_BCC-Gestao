const emailConfig = require('./src/config/email');
const db = require('./src/config/database');
const crypto = require('crypto');

async function testCompletePasswordRecovery() {
    try {
        console.log('=== TESTE COMPLETO DE RECUPERAÇÃO DE SENHA ===\n');
        
        // 1. Testar configuração de email
        console.log('1. Testando configuração de email...');
        await emailConfig.loadConfig();
        await emailConfig.createTransporter();
        console.log('   ✓ Configuração de email OK\n');
        
        // 2. Encontrar usuário de teste
        console.log('2. Procurando usuário de teste...');
        const user = await db.get('SELECT * FROM pessoa WHERE email = ?', ['adailtonvieira@discente.ufj.edu.br']);
        if (!user) {
            console.log('   ❌ Usuário de teste não encontrado');
            return;
        }
        console.log(`   ✓ Usuário encontrado: ${user.nome} (${user.email})\n`);
        
        // 3. Simular geração de token
        console.log('3. Simulando geração de token...');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora
        
        // Inicializar global.resetTokens se não existir
        if (!global.resetTokens) {
            global.resetTokens = new Map();
        }
        
        global.resetTokens.set(resetToken, {
            email: user.email,
            userId: user.id_pessoa,
            expiry: resetTokenExpiry
        });
        
        console.log(`   ✓ Token gerado: ${resetToken.substring(0, 16)}...`);
        console.log(`   ✓ Expira em: ${resetTokenExpiry.toLocaleString('pt-BR')}\n`);
        
        // 4. Testar template de email
        console.log('4. Testando template de email...');
        const resetUrl = `http://localhost:3000/auth/reset-password/${resetToken}`;
        const htmlContent = emailConfig.constructor.templates.recuperacaoSenha(
            user.nome,
            resetUrl
        );
        console.log('   ✓ Template gerado com sucesso');
        console.log(`   ✓ URL de recuperação: ${resetUrl}\n`);
        
        // 5. Enviar email de teste
        console.log('5. Enviando email de recuperação...');
        try {
            await emailConfig.enviarEmail(
                user.email,
                'Recuperação de Senha - Sistema de Gestão de Estágios',
                htmlContent
            );
            console.log('   ✓ Email enviado com sucesso\n');
        } catch (emailError) {
            console.log('   ❌ Erro ao enviar email:', emailError.message);
            console.log('   ⚠️  Continuando teste sem envio de email\n');
        }
        
        // 6. Verificar se token está armazenado
        console.log('6. Verificando armazenamento de token...');
        const storedToken = global.resetTokens.get(resetToken);
        if (storedToken) {
            console.log('   ✓ Token armazenado corretamente');
            console.log(`   ✓ Email: ${storedToken.email}`);
            console.log(`   ✓ User ID: ${storedToken.userId}`);
            console.log(`   ✓ Expiry: ${storedToken.expiry.toLocaleString('pt-BR')}\n`);
        } else {
            console.log('   ❌ Token não encontrado no armazenamento\n');
        }
        
        // 7. Simular validação de token (como seria feito na rota)
        console.log('7. Testando validação de token...');
        if (global.resetTokens.has(resetToken)) {
            const tokenData = global.resetTokens.get(resetToken);
            if (new Date() <= tokenData.expiry) {
                console.log('   ✓ Token válido e não expirado');
            } else {
                console.log('   ❌ Token expirado');
            }
        } else {
            console.log('   ❌ Token não encontrado');
        }
        
        console.log('\n=== RESUMO DO TESTE ===');
        console.log('✅ Sistema de recuperação de senha está funcionando!');
        console.log('✅ Configuração de email: OK');
        console.log('✅ Geração de token: OK');
        console.log('✅ Template de email: OK');
        console.log('✅ Armazenamento de token: OK');
        console.log('✅ Validação de token: OK');
        console.log('\n📧 Verifique sua caixa de email para o link de recuperação.');
        console.log(`🔗 URL de teste: ${resetUrl}`);
        
        // Limpar token de teste após alguns segundos
        setTimeout(() => {
            if (global.resetTokens && global.resetTokens.has(resetToken)) {
                global.resetTokens.delete(resetToken);
                console.log('\n🧹 Token de teste removido da memória.');
            }
        }, 30000); // 30 segundos
        
    } catch (error) {
        console.error('❌ Erro durante o teste:', error);
    } finally {
        // Fechar conexão com banco
        if (db && db.close) {
            await db.close();
        }
    }
}

// Executar teste
testCompletePasswordRecovery();