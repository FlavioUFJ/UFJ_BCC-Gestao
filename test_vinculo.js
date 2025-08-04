const fetch = require('node-fetch');

// Teste da funcionalidade de vincular módulos
async function testarVinculoModulos() {
    try {
        console.log('=== TESTE DE VÍNCULO DE MÓDULOS ===');
        
        // Dados de teste
        const dadosTeste = {
            usuarios: [1, 2], // IDs de usuários de teste
            modulos: [1, 2]   // IDs de módulos de teste
        };
        
        console.log('Dados enviados:', dadosTeste);
        
        const response = await fetch('http://localhost:3000/admin/vincular-modulos-lote', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Cookie': 'connect.sid=test' // Simular sessão de admin
            },
            body: JSON.stringify(dadosTeste)
        });
        
        console.log('Status da resposta:', response.status);
        console.log('Headers da resposta:', response.headers.raw());
        
        const resultado = await response.text();
        console.log('Resposta do servidor:', resultado);
        
        if (response.ok) {
            console.log('✅ Requisição bem-sucedida!');
        } else {
            console.log('❌ Erro na requisição');
        }
        
    } catch (error) {
        console.error('❌ Erro ao testar vínculo:', error.message);
    }
}

// Executar teste
testarVinculoModulos();