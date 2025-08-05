const EstagioController = require('./src/controllers/EstagioController');

async function testModules() {
    try {
        console.log('=== TESTE DE BUSCA DE MÓDULOS ===');
        
        const controller = new EstagioController();
        
        // Testar com ID do coordenador (assumindo que é 2 baseado nos logs anteriores)
        const idPessoa = 2;
        console.log('Testando busca de módulos para usuário ID:', idPessoa);
        
        const modulos = await controller.buscarModulos();
        
        console.log('=== RESULTADO ===');
        console.log('Número de módulos encontrados:', modulos.length);
        console.log('Módulos:', JSON.stringify(modulos, null, 2));
        
        // Verificar se há módulos com acesso
        const modulosComAcesso = modulos.filter(m => m.tem_acesso === 1);
        console.log('Módulos com acesso:', modulosComAcesso.length);
        
        if (modulosComAcesso.length === 0) {
            console.log('PROBLEMA: Usuário não tem acesso a nenhum módulo!');
            console.log('Verificando tabela usuario_modulos...');
            
            const databaseConfig = require('./src/config/database');
            const usuarioModulos = await databaseConfig.all(
                'SELECT * FROM usuario_modulos WHERE id_pessoa = ?', 
                [idPessoa]
            );
            console.log('Registros em usuario_modulos:', usuarioModulos);
        }
        
    } catch (error) {
        console.error('Erro no teste:', error);
    } finally {
        process.exit(0);
    }
}

testModules();