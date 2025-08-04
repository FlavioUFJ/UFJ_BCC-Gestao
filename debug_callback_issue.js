// Script para debugar o problema de seleção após cadastro

// Simular o comportamento do pessoa-manager.js
class PessoaManagerDebug {
    constructor() {
        this.currentCallback = null;
        this.currentInputId = null;
    }
    
    // Simular abertura do modal
    abrirModal(inputId, callback) {
        console.log('🔵 Modal aberto para:', inputId);
        this.currentInputId = inputId;
        this.currentCallback = callback;
        console.log('🔵 Callback definido:', typeof callback);
    }
    
    // Simular cadastro de pessoa
    async cadastrarPessoa(dadosPessoa) {
        console.log('🟡 Iniciando cadastro...', dadosPessoa);
        
        // Simular resposta do servidor
        const mockResponse = {
            success: true,
            pessoa: {
                id_pessoa: 99,
                nome: dadosPessoa.nome,
                email: dadosPessoa.email,
                categoria: dadosPessoa.categoria
            },
            message: 'Pessoa cadastrada com sucesso!'
        };
        
        console.log('🟢 Resposta simulada do servidor:', mockResponse);
        
        if (mockResponse.success) {
            console.log('✅ Cadastro bem-sucedido, executando callback...');
            
            // Verificar se callback existe
            if (this.currentCallback) {
                console.log('🔵 Callback encontrado, executando...');
                const pessoa = mockResponse.pessoa;
                
                try {
                    // Executar callback
                    this.currentCallback(pessoa.id_pessoa, pessoa.nome);
                    console.log('✅ Callback executado com sucesso!');
                } catch (error) {
                    console.error('❌ Erro ao executar callback:', error);
                }
            } else {
                console.error('❌ Nenhum callback definido!');
            }
        } else {
            console.error('❌ Erro no cadastro:', mockResponse.message);
        }
    }
    
    // Simular seleção manual de pessoa
    selecionarPessoa(id, nome) {
        console.log('🟣 Seleção manual de pessoa:', { id, nome });
        
        if (this.currentCallback) {
            console.log('🔵 Executando callback para seleção manual...');
            this.currentCallback(id, nome);
            console.log('✅ Callback de seleção manual executado!');
        } else {
            console.error('❌ Nenhum callback definido para seleção manual!');
        }
    }
}

// Simular callback do campo de supervisor
function callbackSupervisor(id, nome) {
    console.log('📝 Callback do supervisor executado:');
    console.log('   - ID:', id);
    console.log('   - Nome:', nome);
    
    // Simular preenchimento dos campos
    console.log('📝 Preenchendo campos:');
    console.log('   - id_pessoa_supervisor =', id);
    console.log('   - nome_supervisor_nome =', nome);
    
    // Simular busca de dados do supervisor
    console.log('🔍 Buscando dados adicionais do supervisor...');
    setTimeout(() => {
        console.log('✅ Dados do supervisor carregados!');
    }, 100);
}

// Teste do fluxo completo
console.log('=== TESTE DO FLUXO DE CADASTRO E SELEÇÃO ===\n');

const manager = new PessoaManagerDebug();

// 1. Abrir modal para supervisor
manager.abrirModal('id_pessoa_supervisor', callbackSupervisor);

// 2. Cadastrar nova pessoa
const dadosNovoSupervisor = {
    nome: 'Supervisor Teste Debug',
    email: 'supervisor.debug@empresa.com',
    telefone: '',
    categoria: '5',
    tipo: 'F'
};

setTimeout(() => {
    console.log('\n--- EXECUTANDO CADASTRO ---');
    manager.cadastrarPessoa(dadosNovoSupervisor);
}, 500);

// 3. Testar seleção manual também
setTimeout(() => {
    console.log('\n--- TESTANDO SELEÇÃO MANUAL ---');
    manager.selecionarPessoa(123, 'Supervisor Manual');
}, 1000);

console.log('\n=== TESTE INICIADO ===');