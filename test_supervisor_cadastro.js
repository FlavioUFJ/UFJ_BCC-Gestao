const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// Dados de teste para supervisor sem telefone
const testData = {
    nome: 'Teste Supervisor',
    email: 'teste.supervisor@empresa.com',
    telefone: '', // Campo vazio
    cnpj_cpf: '',
    tipo: 'F', // Pessoa Física
    categoria: '5' // Supervisor
};

console.log('Testando cadastro de supervisor sem telefone...');
console.log('Dados:', testData);

// Primeiro verificar se já existe
db.get('SELECT id_pessoa FROM pessoa WHERE email = ?', [testData.email], (err, existingPerson) => {
    if (err) {
        console.error('Erro ao verificar email:', err);
        db.close();
        return;
    }
    
    if (existingPerson) {
        console.log('Pessoa já existe, removendo para teste...');
        db.run('DELETE FROM pessoa WHERE email = ?', [testData.email], (err) => {
            if (err) {
                console.error('Erro ao remover pessoa existente:', err);
                db.close();
                return;
            }
            insertPessoa();
        });
    } else {
        insertPessoa();
    }
});

function insertPessoa() {
    const sql = `INSERT INTO pessoa (nome, email, telefone, cnpj_cpf, tipo, categoria, dataCadastro) 
                 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
    
    console.log('\nExecutando INSERT...');
    console.log('SQL:', sql);
    console.log('Parâmetros:', [testData.nome, testData.email, testData.telefone, testData.cnpj_cpf, testData.tipo, testData.categoria]);
    
    db.run(sql, [testData.nome, testData.email, testData.telefone, testData.cnpj_cpf, testData.tipo, testData.categoria], function(err) {
        if (err) {
            console.error('\n❌ ERRO ao inserir pessoa:', err);
            console.error('Código do erro:', err.code);
            console.error('Mensagem:', err.message);
        } else {
            console.log('\n✅ Pessoa inserida com sucesso!');
            console.log('ID gerado:', this.lastID);
            
            // Buscar a pessoa recém-criada
            db.get('SELECT * FROM pessoa WHERE id_pessoa = ?', [this.lastID], (err, pessoa) => {
                if (err) {
                    console.error('Erro ao buscar pessoa criada:', err);
                } else {
                    console.log('\nDados da pessoa criada:');
                    console.log(pessoa);
                }
                db.close();
            });
        }
    });
}