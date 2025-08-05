const db = require('./src/config/database');

async function listAllIdentifiers() {
    try {
        console.log('=== IDENTIFICADORES USADOS NA APLICAÇÃO ===\n');
        
        // 1. Identificadores de parâmetros principais
        console.log('1. IDENTIFICADORES DE PARÂMETROS PRINCIPAIS:');
        const parametros = await db.all('SELECT DISTINCT identificador FROM parametro ORDER BY identificador');
        parametros.forEach(p => {
            console.log(`   - "${p.identificador}"`);
        });
        
        // 2. Identificadores de valores de parâmetros
        console.log('\n2. IDENTIFICADORES DE VALORES DE PARÂMETROS:');
        const valores = await db.all('SELECT DISTINCT identificadorvalor FROM parametrovalor ORDER BY identificadorvalor');
        valores.forEach(v => {
            console.log(`   - "${v.identificadorvalor}"`);
        });
        
        // 3. Identificadores de email específicos (baseado no código)
        console.log('\n3. IDENTIFICADORES DE EMAIL (ESPERADOS PELA APLICAÇÃO):');
        const emailIdentifiers = [
            'Servidor SMTP',
            'Porta SMTP', 
            'Usuário do E-mail',
            'Senha',
            'E-mail Remetente'
        ];
        emailIdentifiers.forEach(id => {
            console.log(`   - "${id}"`);
        });
        
        // 4. Outros identificadores encontrados no código
        console.log('\n4. OUTROS IDENTIFICADORES ENCONTRADOS NO CÓDIGO:');
        const outrosIdentifiers = [
            'Apólice de Seguro',
            'Número da Apólice',
            'Nome da Seguradora',
            'situacao_estagio'
        ];
        outrosIdentifiers.forEach(id => {
            console.log(`   - "${id}"`);
        });
        
        // 5. Campos de email em tabelas
        console.log('\n5. CAMPOS DE EMAIL EM TABELAS:');
        const emailFields = [
            'email_estagiario',
            'email_supervisor', 
            'email_orientador',
            'email_coordenador',
            'email_concedente',
            'email_curso',
            'email_empresa'
        ];
        emailFields.forEach(field => {
            console.log(`   - ${field}`);
        });
        
        // 6. Verificar quais identificadores de email estão realmente no banco
        console.log('\n6. STATUS DOS IDENTIFICADORES DE EMAIL NO BANCO:');
        for (const emailId of emailIdentifiers) {
            const existe = await db.get(`
                SELECT COUNT(*) as count 
                FROM parametrovalor pv 
                INNER JOIN parametro p ON p.id_parametro = pv.id_parametro 
                WHERE p.identificador = 'Conta e-mail' AND pv.identificadorvalor = ?
            `, [emailId]);
            
            const status = existe.count > 0 ? '✓ EXISTE' : '✗ NÃO EXISTE';
            console.log(`   - "${emailId}": ${status}`);
        }
        
        console.log('\n=== RESUMO ===');
        console.log(`Total de parâmetros principais: ${parametros.length}`);
        console.log(`Total de valores de parâmetros: ${valores.length}`);
        console.log('\nPara o sistema de email funcionar, você precisa alterar no banco de dados:');
        console.log('- Os identificadores atuais (email_host, email_port, etc.)');
        console.log('- Para os identificadores esperados (Servidor SMTP, Porta SMTP, etc.)');
        
    } catch (error) {
        console.error('Erro:', error);
    }
}

listAllIdentifiers();