const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');
const db = new sqlite3.Database('./database.db');

// Simular o fluxo completo do problema
async function testarFluxoCompleto() {
    console.log('=== TESTE DO FLUXO COMPLETO ===\n');
    
    // 1. Cadastrar supervisor sem telefone
    const testData = {
        nome: 'Supervisor Teste Completo',
        email: 'supervisor.completo@empresa.com',
        telefone: '', // Campo vazio - aqui está o problema
        cnpj_cpf: '',
        tipo: 'F',
        categoria: '5'
    };
    
    console.log('1. Cadastrando supervisor sem telefone...');
    console.log('Dados:', testData);
    
    // Primeiro limpar se já existe
    await new Promise((resolve, reject) => {
        db.run('DELETE FROM pessoa WHERE email = ?', [testData.email], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
    
    // Inserir nova pessoa
    const idPessoa = await new Promise((resolve, reject) => {
        const sql = `INSERT INTO pessoa (nome, email, telefone, cnpj_cpf, tipo, categoria, dataCadastro) 
                     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
        
        db.run(sql, [testData.nome, testData.email, testData.telefone, testData.cnpj_cpf, testData.tipo, testData.categoria], function(err) {
            if (err) {
                console.error('❌ ERRO ao inserir pessoa:', err);
                reject(err);
            } else {
                console.log('✅ Pessoa inserida com sucesso! ID:', this.lastID);
                resolve(this.lastID);
            }
        });
    });
    
    // 2. Buscar a pessoa recém-criada diretamente do banco
    console.log('\n2. Buscando pessoa diretamente do banco...');
    const pessoaBanco = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM pessoa WHERE id_pessoa = ?', [idPessoa], (err, pessoa) => {
            if (err) reject(err);
            else resolve(pessoa);
        });
    });
    
    console.log('Dados do banco:', pessoaBanco);
    
    // 3. Simular busca via API (como faria o frontend)
    console.log('\n3. Simulando busca via API /api/pessoas/' + idPessoa);
    
    // Simular a resposta da API baseada no código do server.js
    const simulateApiResponse = (pessoa) => {
        if (!pessoa) {
            return { success: false, message: 'Pessoa não encontrada' };
        }
        return { success: true, pessoa: pessoa };
    };
    
    const apiResponse = simulateApiResponse(pessoaBanco);
    console.log('Resposta da API:', JSON.stringify(apiResponse, null, 2));
    
    // 4. Simular preenchimento dos campos (como faz buscarDadosSupervisor)
    console.log('\n4. Simulando preenchimento dos campos...');
    if (apiResponse.success && apiResponse.pessoa) {
        const telefone = apiResponse.pessoa.telefone || '';
        const email = apiResponse.pessoa.email || '';
        
        console.log('Campo telefone_supervisor seria preenchido com:', `"${telefone}"`);
        console.log('Campo email_supervisor seria preenchido com:', `"${email}"`);
        
        // Verificar se há problemas com valores vazios
        if (telefone === '') {
            console.log('⚠️  ATENÇÃO: Telefone está vazio!');
        }
        if (email === '') {
            console.log('⚠️  ATENÇÃO: Email está vazio!');
        }
    } else {
        console.log('❌ ERRO: Não foi possível buscar dados da pessoa');
        console.log('Mensagem:', apiResponse.message);
    }
    
    // 5. Testar busca por termo (como na lista de seleção)
    console.log('\n5. Testando busca por termo (simulando lista de seleção)...');
    const termoBusca = testData.nome.substring(0, 5); // Primeiras 5 letras
    
    const pessoasBusca = await new Promise((resolve, reject) => {
        const sql = `SELECT * FROM pessoa WHERE categoria = ? AND (nome LIKE ? OR email LIKE ?)`;
        const params = ['5', `%${termoBusca}%`, `%${termoBusca}%`];
        
        db.all(sql, params, (err, pessoas) => {
            if (err) reject(err);
            else resolve(pessoas);
        });
    });
    
    console.log(`Busca por "${termoBusca}" na categoria Supervisor:`);
    console.log(`Encontradas ${pessoasBusca.length} pessoa(s)`);
    
    pessoasBusca.forEach((pessoa, index) => {
        console.log(`  ${index + 1}. ${pessoa.nome} (ID: ${pessoa.id_pessoa}) - Tel: "${pessoa.telefone}" - Email: "${pessoa.email}"`);
    });
    
    // 6. Verificar se a pessoa aparece na busca
    const pessoaEncontrada = pessoasBusca.find(p => p.id_pessoa === idPessoa);
    if (pessoaEncontrada) {
        console.log('✅ Pessoa encontrada na busca!');
    } else {
        console.log('❌ Pessoa NÃO encontrada na busca!');
    }
    
    console.log('\n=== TESTE CONCLUÍDO ===');
    db.close();
}

// Executar teste
testarFluxoCompleto().catch(console.error);